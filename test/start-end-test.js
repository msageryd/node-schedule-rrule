'use strict';

var sinon = require('sinon');
var main = require('../package.json').main;
var schedule = require('../' + main);
const {RRule, rrulestr} = require('rrule');
var clock;

var base = new Date(Date.UTC(2010, 3, 29, 12, 30, 15, 0));
var baseMs = base.getTime();

//Helper function to build iCal date strings from current time with an offset
function parseDate(offsetMs) {
  const now = new Date();
  const date = new Date(now.getTime() + offsetMs);

  const year = date.getUTCFullYear();
  const month = ('' + (date.getUTCMonth() + 1)).padStart(2, '0');
  const day = ('' + date.getUTCDate()).padStart(2, '0');
  const hour = ('' + date.getUTCHours()).padStart(2, '0');
  const minute = ('' + date.getUTCMinutes()).padStart(2, '0');
  const second = ('' + date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

module.exports = {
  setUp: function(cb) {
    clock = sinon.useFakeTimers(baseMs);
    cb();
  },
  RecurrenceRule: {
    'no endTime , startTime less than now': function(test) {
      test.expect(3);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      job.schedule({
        freq: RRule.SECONDLY,
        dtstart: new Date(Date.now() - 2000),
      });

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'no endTime , startTime greater than now': function(test) {
      test.expect(1);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      job.schedule({
        freq: RRule.SECONDLY,
        dtstart: new Date(Date.now() + 2000),
      });

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'no startTime , endTime less than now': function(test) {
      test.expect(0);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      job.schedule({
        freq: RRule.SECONDLY,
        until: new Date(Date.now() - 2000),
      });

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'no startTime , endTime greater than now': function(test) {
      test.expect(2);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      job.schedule({
        freq: RRule.SECONDLY,
        until: new Date(Date.now() + 2000),
      });

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'has startTime and endTime': function(test) {
      test.expect(1);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      job.schedule({
        freq: RRule.SECONDLY,
        dtstart: new Date(Date.now() + 1000),
        until: new Date(Date.now() + 2000),
      });

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
  },

  'iCal-string': {
    'no endTime , startTime less than now': function(test) {
      test.expect(3);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      const start = parseDate(-2000);
      job.schedule(`DTSTART:${start}\nRRULE:FREQ=SECONDLY`);

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'no endTime , startTime greater than now': function(test) {
      test.expect(1);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      const start = parseDate(+2000);
      job.schedule(`DTSTART:${start}\nRRULE:FREQ=SECONDLY`);

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'no startTime , endTime less than now': function(test) {
      test.expect(0);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      const end = parseDate(-2000);
      job.schedule(`RRULE:UNTIL=${end};FREQ=SECONDLY`);

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'no startTime , endTime greater than now': function(test) {
      test.expect(2);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      const end = parseDate(+2000);
      job.schedule(`RRULE:UNTIL=${end};FREQ=SECONDLY`);

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
    'has startTime and endTime': function(test) {
      test.expect(1);

      var job = new schedule.Job(function() {
        test.ok(true);
      });

      const start = parseDate(+1000);
      const end = parseDate(+2000);
      job.schedule(`DTSTART:${start}\nRRULE:UNTIL=${end};FREQ=SECONDLY`);

      setTimeout(function() {
        job.cancel();
        test.done();
      }, 3250);

      clock.tick(3250);
    },
  },
  tearDown: function(cb) {
    clock.restore();
    cb();
  },
};
