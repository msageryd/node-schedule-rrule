'use strict';

/*
  node-schedule-rrule
  An RRule version of node-schedule
*/

const util = require('util');
const events = require('events');
const lt = require('long-timeout');
const sorted = require('sorted-array-functions');
const {RRule, RRuleSet, rrulestr} = require('rrule');

const Invocation = require('./invocation');
const RecurrenceRule = require('./recurrenceRule');
const {isValidDate, fireDateSorter} = require('./util');

let anonJobCounter = 0;
let scheduledJobs = {};
let invocations = [];
let currentInvocation = null;

function Job(name, callback) {
  this.pendingInvocations = [];
  this.invocationCounter = 0;

  var jobName = name && typeof name === 'string' ? name : `<Anonymous Job ${++anonJobCounter}>`;
  this.callback = name && typeof name === 'function' ? name : callback;

  if (!this.callback) throw new Error('Job must have a callback.');

  // define a name property. We rely on name as key in the scheduledJobs
  // object so we want to protect against changes.
  Object.defineProperty(this, 'name', {
    value: jobName,
    writable: false,
    enumerable: true,
  });
}

util.inherits(Job, events.EventEmitter);

Job.prototype.invoke = function(invocationDate) {
  this.callback({
    jobName: this.name,
    invocationDate,
    prevInvocationDate: this.prevInvocationDate,
    invocationCount: ++this.invocationCounter,
  });
  this.prevInvocationDate = invocationDate;
};

Job.prototype.schedule = function(spec) {
  let self = this;
  let success = false;

  this.recurrenceRule = new RecurrenceRule(spec);

  const now = new Date();
  const start =
    this.recurrenceRule.start.getTime() < now.getTime() ? now : this.recurrenceRule.start;
  const end = this.recurrenceRule.end;

  //Since this is a new schedule we will back off the startdate by 1 millisecond in order
  //to correctly identify the first scheduled invocation as "next"
  // start = new Date(start.getTime() - 1);

  const inv = scheduleNextRecurrence(self, start, end);
  if (inv !== null) {
    success = self.trackInvocation(inv);
  }

  scheduledJobs[this.name] = this;
  return success;
};

Job.prototype.trackInvocation = function(invocation) {
  // add to our invocation list
  sorted.add(this.pendingInvocations, invocation, fireDateSorter);
  return true;
};
Job.prototype.stopTrackingInvocation = function(invocation) {
  var invIdx = this.pendingInvocations.indexOf(invocation);
  if (invIdx > -1) {
    this.pendingInvocations.splice(invIdx, 1);
    return true;
  }

  return false;
};

Job.prototype.cancel = function(reschedule) {
  reschedule = typeof reschedule == 'boolean' ? reschedule : false;

  var inv, newInv;
  const nextInv = this.pendingInvocations.length ? this.pendingInvocations[0] : null;

  for (var j = 0; j < this.pendingInvocations.length; j++) {
    inv = this.pendingInvocations[j];
    cancelInvocation(inv);
  }

  this.pendingInvocations = [];

  if (nextInv && reschedule && this.recurrenceRule.rule) {
    newInv = scheduleNextRecurrence(this, nextInv.fireDate, nextInv.endDate);
    if (newInv !== null) {
      this.trackInvocation(newInv);
    }
  }

  // remove from scheduledJobs if reschedule === false
  if (!reschedule) {
    if (this.name) {
      delete scheduledJobs[this.name];
    }
  }

  return true;
};

Job.prototype.reschedule = function(spec) {
  var inv;
  var cInvs = this.pendingInvocations.slice();

  for (var j = 0; j < cInvs.length; j++) {
    inv = cInvs[j];

    cancelInvocation(inv);
  }

  this.pendingInvocations = [];

  if (this.schedule(spec)) {
    return true;
  } else {
    this.pendingInvocations = cInvs;
    return false;
  }
};

Job.prototype.nextInvocation = function() {
  if (!this.pendingInvocations.length) {
    return null;
  }
  return this.pendingInvocations[0].fireDate;
};

/* Date-based scheduler */
function runOnDate(date, job) {
  var now = Date.now();
  var then = date.getTime();

  return lt.setTimeout(
    function() {
      if (then > Date.now()) runOnDate(date, job);
      else job();
    },
    then < now ? 0 : then - now
  );
}

function scheduleInvocation(invocation) {
  sorted.add(invocations, invocation, fireDateSorter);
  prepareNextInvocation();
  invocation.job.emit('scheduled', invocation.fireDate);
}

function prepareNextInvocation() {
  if (invocations.length > 0 && currentInvocation !== invocations[0]) {
    if (currentInvocation !== null) {
      lt.clearTimeout(currentInvocation.timerID);
      currentInvocation.timerID = null;
      currentInvocation = null;
    }

    currentInvocation = invocations[0];

    var job = currentInvocation.job;
    var cinv = currentInvocation;

    currentInvocation.timerID = runOnDate(currentInvocation.fireDate, function() {
      currentInvocationFinished();

      var newInv = scheduleNextRecurrence(cinv.job, cinv.fireDate, cinv.endDate);
      if (newInv !== null) {
        job.trackInvocation(newInv);
      }

      job.stopTrackingInvocation(cinv);
      job.invoke(cinv.fireDate);
      job.emit('run');
    });
  }
}

function currentInvocationFinished() {
  invocations.shift();
  currentInvocation = null;
  prepareNextInvocation();
}

function cancelInvocation(invocation) {
  var idx = invocations.indexOf(invocation);
  if (idx > -1) {
    invocations.splice(idx, 1);
    if (invocation.timerID !== null) {
      lt.clearTimeout(invocation.timerID);
    }

    if (currentInvocation === invocation) {
      currentInvocation = null;
    }

    invocation.job.emit('canceled', invocation.fireDate);
    prepareNextInvocation();
  }
}

/* Recurrence scheduler */
function scheduleNextRecurrence(job, prevDate, endDate) {
  prevDate = prevDate || new Date();

  job.recurrenceRule.safelyResetStartDate();
  const date = job.recurrenceRule.nextInvocationDate(prevDate);

  if (date === null) {
    return null;
  }
  if (endDate && date.getTime() > endDate.getTime()) {
    return null;
  }

  const inv = new Invocation(job, date, endDate);
  scheduleInvocation(inv);

  return inv;
}

/* Convenience methods */
function scheduleJob() {
  if (arguments.length < 2) {
    return null;
  }

  var name = arguments.length >= 3 && typeof arguments[0] === 'string' ? arguments[0] : null;
  var spec = name ? arguments[1] : arguments[0];
  var callback = name ? arguments[2] : arguments[1];

  var job = new Job(name, callback);

  if (job.schedule(spec)) {
    return job;
  }

  return null;
}

function rescheduleJob(job, spec) {
  if (job instanceof Job) {
    if (job.reschedule(spec)) {
      return job;
    }
  } else if (typeof job == 'string' || job instanceof String) {
    if (job in scheduledJobs && scheduledJobs.hasOwnProperty(job)) {
      if (scheduledJobs[job].reschedule(spec)) {
        return scheduledJobs[job];
      }
    }
  }
  return null;
}

function cancelJob(job) {
  var success = false;
  if (job instanceof Job) {
    success = job.cancel();
  } else if (typeof job == 'string' || job instanceof String) {
    if (job in scheduledJobs && scheduledJobs.hasOwnProperty(job)) {
      success = scheduledJobs[job].cancel();
    }
  }

  return success;
}

/* Public API */
module.exports.Job = Job;
module.exports.scheduleJob = scheduleJob;
module.exports.rescheduleJob = rescheduleJob;
module.exports.RecurrenceRule = RecurrenceRule;
module.exports.scheduledJobs = scheduledJobs;
module.exports.cancelJob = cancelJob;
