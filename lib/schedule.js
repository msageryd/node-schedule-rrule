'use strict';

/*
  node-schedule-rrule
  An RRule version of node-schedule
*/

const events = require('events');
const util = require('util');
const lt = require('long-timeout');
const sorted = require('sorted-array-functions');
const {RRule, RRuleSet, rrulestr} = require('rrule');

const RecurrenceRule = require('./recurrenceRule');
const Invocation = require('./invocation');

/* Job object */
let anonJobCounter = 0;
let scheduledJobs = {};

const DTSTART_RESET_LIMIT = 3;

function isValidDate(date) {
  // Taken from http://stackoverflow.com/a/12372720/1562178
  // If getTime() returns NaN it'll return false anyway
  return date.getTime() === date.getTime();
}

function Job(name, callback) {
  // setup a private pendingInvocations variable
  this.pendingInvocations = [];

  var jobName =
    name && typeof name === 'string' ? name : '<Anonymous Job ' + ++anonJobCounter + '>';

  this.callback = name && typeof name === 'function' ? name : callback;

  // define properties
  Object.defineProperty(this, 'name', {
    value: jobName,
    writable: false,
    enumerable: true,
  });
}

util.inherits(Job, events.EventEmitter);

Job.prototype.invoke = function(invocationDate) {
  this.callback &&
    this.callback({
      jobName: this.name,
      invocationDate,
      lastInvocationDate: this.lastInvocationDate,
    });
  this.lastInvocationDate = invocationDate;
};

Job.prototype.schedule = function(spec) {
  var self = this;
  var success = false;
  var inv;
  var start;
  var end;

  const now = new Date();
  const recurrenceRule = spec instanceof RecurrenceRule ? spec : new RecurrenceRule(spec);
  start =
    recurrenceRule.rule.options.dtstart.getTime() < now.getTime()
      ? now
      : recurrenceRule.rule.options.dtstart;

  end = recurrenceRule.rule.options.until;

  //Since this is a new schedule we will back off the startdate by 1 millisecond in order
  //to correctly identify the first scheduled invocation as "next"
  start = new Date(start.getTime() - 1);

  inv = scheduleNextRecurrence(recurrenceRule, self, start, end);
  if (inv !== null) {
    success = self.trackInvocation(inv);
  }

  scheduledJobs[this.name] = this;
  return success;
};

Job.prototype.trackInvocation = function(invocation) {
  // add to our invocation list
  sorted.add(this.pendingInvocations, invocation, sorter);
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
  var newInvs = [];
  for (var j = 0; j < this.pendingInvocations.length; j++) {
    inv = this.pendingInvocations[j];

    cancelInvocation(inv);

    if (reschedule && (inv.recurrenceRule.recurs || inv.recurrenceRule.next)) {
      newInv = scheduleNextRecurrence(inv.recurrenceRule, this, inv.fireDate, inv.endDate);
      //TODO: if newInv === null, the job should be cancelled
      if (newInv !== null) {
        newInvs.push(newInv);
      }
    }
  }

  this.pendingInvocations = [];

  for (var k = 0; k < newInvs.length; k++) {
    this.trackInvocation(newInvs[k]);
  }

  // remove from scheduledJobs if reschedule === false
  if (!reschedule) {
    if (this.name) {
      delete scheduledJobs[this.name];
    }
  }

  return true;
};
Job.prototype.cancelNext = function(reschedule) {
  reschedule = typeof reschedule == 'boolean' ? reschedule : true;

  if (!this.pendingInvocations.length) {
    return false;
  }

  var newInv;
  var nextInv = this.pendingInvocations.shift();

  cancelInvocation(nextInv);

  if (reschedule && (nextInv.recurrenceRule.recurs || nextInv.recurrenceRule.next)) {
    newInv = scheduleNextRecurrence(
      nextInv.recurrenceRule,
      this,
      nextInv.fireDate,
      nextInv.endDate
    );
    if (newInv !== null) {
      this.trackInvocation(newInv);
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
    this.setTriggeredJobs(0);
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

function sorter(a, b) {
  return a.fireDate.getTime() - b.fireDate.getTime();
}

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

var invocations = [];
var currentInvocation = null;

function scheduleInvocation(invocation) {
  sorted.add(invocations, invocation, sorter);
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

      if (cinv.recurrenceRule.recurs || cinv.recurrenceRule._endDate === null) {
        var inv = scheduleNextRecurrence(
          cinv.recurrenceRule,
          cinv.job,
          cinv.fireDate,
          cinv.endDate
        );
        if (inv !== null) {
          inv.job.trackInvocation(inv);
        }
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
function scheduleNextRecurrence(recurrenceRule, job, prevDate, endDate) {
  prevDate = prevDate || new Date();

  if (recurrenceRule.iterations % DTSTART_RESET_LIMIT === 0) {
    //Reset dtstart to get rid of unneeded history. RRule.after() takes a conciderable
    //performance hit if dtstart is many occurances back in time
    //https://github.com/jakubroztocil/rrule/issues/407

    const newDTstart = calcSafeDTstart(recurrenceRule.rule);
    if (newDTstart) {
      console.log(
        `Resetting dtstart for ${job.name} from ${recurrenceRule.rule.options.dtstart} to ${newDTstart}`
      );

      recurrenceRule.rule = new RRule({
        ...recurrenceRule.rule.options,
        dtstart: newDTstart,
      });
    }
  }

  var date = recurrenceRule.nextInvocationDate(prevDate);

  if (date === null) {
    return null;
  }

  if (endDate && date.getTime() > endDate.getTime()) {
    return null;
  }

  var inv = new Invocation(job, date, recurrenceRule, endDate);
  scheduleInvocation(inv);

  recurrenceRule.iterations++;
  return inv;
}

/* Convenience methods */
function scheduleJob() {
  if (arguments.length < 2) {
    return null;
  }

  var name = arguments.length >= 3 && typeof arguments[0] === 'string' ? arguments[0] : null;
  var spec = name ? arguments[1] : arguments[0];
  // var method = name ? arguments[2] : arguments[1];
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

function calcSafeDTstart(rule) {
  /*
    We want to set a new dtstart as close to current time as possible in
    order to minimise the number of past occurances, since these will degrade
    the performance of RRule.after()

    But we cannot simply set dtstart = new Date(), becase we could miss some
    details in the role.

    The concept is to back off dtstart from current time, far enough to comply
    with freq and interval. We will essentilly back off with freq*interval from current time
  */
  const {count, freq, dtstart, interval, until} = rule.options;
  const now = new Date();

  //If the count attribute is used we cannot safely change dtstart, since this would
  //compromise the occurance counter
  if (count) return null;

  //No need to do anything if we have passed the until date
  if (until && until.getTime() < now.getTime()) return null;

  //We don't want to change dtstart if we haven't even reached that time
  if (dtstart.getTime() > now.getTime()) return null;

  let offset;
  switch (freq) {
    case RRule.YEARLY:
      offset = 365 * 24 * 60 * 60 * 1000 * interval;
      break;
    case RRule.MONTHLY:
      offset = 31 * 24 * 60 * 60 * 1000 * interval;
      break;
    case RRule.WEEKLY:
      offset = 7 * 24 * 60 * 60 * 1000 * interval;
      break;
    case RRule.DAILY:
      offset = 24 * 60 * 60 * 1000 * interval;
      break;
    case RRule.HOURLY:
      offset = 60 * 60 * 1000 * interval;
      break;
    case RRule.MINUTELY:
      offset = 60 * 1000 * interval;
      break;
    case RRule.SECONDLY:
      offset = 1000 * interval;
      break;
  }

  return new Date(now.getTime() - offset);
}

/* Public API */
module.exports.Job = Job;
module.exports.RecurrenceRule = RecurrenceRule;
module.exports.Invocation = Invocation;
module.exports.scheduleJob = scheduleJob;
module.exports.rescheduleJob = rescheduleJob;
module.exports.scheduledJobs = scheduledJobs;
module.exports.cancelJob = cancelJob;
