'use strict';

var main = require('../package.json').main;
var schedule = require('../' + main);
var sinon = require('sinon');
const {RRule} = require('rrule');
var clock;

// 12:30:15 pm Thursday 29 April 2010 in the timezone this code is being run in
var base = new Date(Date.UTC(2010, 3, 29, 12, 30, 15, 0));
var baseMs = base.getTime();

const RR_EVERY_SECOND = 'DTSTART:19700101T000000\nRRULE:FREQ=SECONDLY;WKST=MO';
const RR_EVERY_MINUTE = 'DTSTART:19700101T000000\nRRULE:FREQ=MINUTELY;WKST=MO';
const RR_UNTIL_1960 = 'DTSTART:19600803T190600\nRRULE:FREQ=SECONDLY;UNTIL=19600803T190700;WKST=MO';

module.exports = {
  setUp: function(cb) {
    clock = sinon.useFakeTimers(baseMs);
    cb();
  },
  tearDown: function(cb) {
    clock.restore();
    cb();
  },
  '#nextInvocationDate(Date)': {
    'next second': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.SECONDLY,
      });
      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 12, 30, 16, 0)), next);
      test.done();
    },
    'next 25th second': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.MINUTELY,
        bysecond: 25,
      });
      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 12, 30, 25, 0)), next);
      test.done();
    },
    'next 5th second (minutes incremented)': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.MINUTELY,
        bysecond: 5,
      });
      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 12, 31, 5, 0)), next);
      test.done();
    },
    'next 40th minute': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.HOURLY,
        bysecond: 0,
        byminute: 40,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 12, 40, 0, 0)), next);
      test.done();
    },
    'next 1st minute (hours incremented)': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.HOURLY,
        bysecond: 0,
        byminute: 1,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 1, 0, 0)), next);
      test.done();
    },
    'next 23rd hour': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.DAILY,
        bysecond: 0,
        byminute: 0,
        byhour: 23,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 23, 0, 0, 0)), next);
      test.done();
    },
    'next 3rd hour (days incremented)': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.DAILY,
        bysecond: 0,
        byminute: 0,
        byhour: 3,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 30, 3, 0, 0, 0)), next);
      test.done();
    },
    'next Friday': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.WEEKLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        byweekday: RRule.FR,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 30, 0, 0, 0, 0)), next);
      test.done();
    },
    'next Monday (months incremented)': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.WEEKLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        byweekday: RRule.MO,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 4, 3, 0, 0, 0, 0)), next);
      test.done();
    },
    'next 30th date': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.MONTHLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 30,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 30, 0, 0, 0, 0)), next);
      test.done();
    },
    'next 5th date (months incremented)': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.MONTHLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 5,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 4, 5, 0, 0, 0, 0)), next);
      test.done();
    },
    'next October': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.YEARLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 1,
        bymonth: 10,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 9, 1, 0, 0, 0, 0)), next);
      test.done();
    },
    'next February (years incremented)': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.YEARLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 1,
        bymonth: 2,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2011, 1, 1, 0, 0, 0, 0)), next);
      test.done();
    },
    //byyear not supported by RRule
    // 'in the year 2040': function(test) {
    //   let rule = new schedule.RecurrenceRule({
    //     freq: RRule.YEARLY,
    //     bysecond: 0,
    //     byminute: 0,
    //     byhour: 0,
    //     bymonthday: 1,
    //     bymonth: 1,
    //     byyear: 2040,
    //   });

    //   let next = rule.nextInvocationDate(base);

    //   test.deepEqual(new Date(Date.UTC(2040, 0, 1, 0, 0, 0, 0)), next);
    //   test.done();
    // },
    // 'using past year': function(test) {
    //   let rule = new schedule.RecurrenceRule();
    //   rule.year = 2000;

    //   let next = rule.nextInvocationDate(base);

    //   test.equal(null, next);
    //   test.done();
    // },
    'using mixed time components': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.DAILY,
        bysecond: 50,
        byminute: 5,
        byhour: 10,
      });

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(Date.UTC(2010, 3, 30, 10, 5, 50, 0)), next);
      test.done();
    },
    /*
    "using date and dayOfWeek together": function(test) {
      let rule = new schedule.RecurrenceRule();
      rule.dayOfWeek = 4; // This is Thursday April 1st
      rule.date = 10;   // This is Saturday April 10th

      let next = rule.nextInvocationDate(base);

      test.deepEqual(new Date(2010, 3, 1, 0, 0, 0, 0), next);
      test.done();
    }*/
    'returns null when no invocations left': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.DAILY,
        bysecond: 50,
        byminute: 5,
        byhour: 10,
        until: new Date(Date.UTC(2000, 3, 30, 10, 5, 50, 0)),
      });

      let next = rule.nextInvocationDate(base);

      test.strictEqual(null, next);
      test.done();
    },
    'specify span of components using Range': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.HOURLY,
        bysecond: 0,
        byminute: [4, 5, 6],
      });

      let next;

      next = rule.nextInvocationDate(base);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 4, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 5, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 6, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 14, 4, 0, 0)), next);

      test.done();
    },
    'specify intervals within span of components using Range with step': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.HOURLY,
        bysecond: 0,
        byminute: [4, 6, 8],
      });

      let next;

      next = rule.nextInvocationDate(base);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 4, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 6, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 8, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 14, 4, 0, 0)), next);

      test.done();
    },
    'specify span and explicit components using Array of Ranges and Numbers': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.HOURLY,
        bysecond: 0,
        byminute: [2, 4, 5, 6],
      });

      let next;

      next = rule.nextInvocationDate(base);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 2, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 4, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 5, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 13, 6, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2010, 3, 29, 14, 2, 0, 0)), next);

      test.done();
    },
    'From 31th May schedule the 1st of every June': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.YEARLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 1,
        bymonth: 6,
      });

      let next;
      var base1 = new Date(Date.UTC(2010, 4, 31, 12, 30, 15, 0));

      next = rule.nextInvocationDate(base1);
      test.deepEqual(new Date(Date.UTC(2010, 5, 1, 0, 0, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.deepEqual(new Date(Date.UTC(2011, 5, 1, 0, 0, 0, 0)), next);

      test.done();
    },
    'With the year set should not loop indefinetely': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.YEARLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 1,
        bymonth: 6,
        until: new Date(Date.UTC(2011, 0, 1, 0, 0, 0, 0)),
      });

      let next;
      var base1 = new Date(Date.UTC(2010, 4, 31, 12, 30, 15, 0));

      next = rule.nextInvocationDate(base1);
      test.deepEqual(new Date(Date.UTC(2010, 5, 1, 0, 0, 0, 0)), next);

      next = rule.nextInvocationDate(next);
      test.equal(next, null);

      test.done();
    },
    'nextInvocationDate on an invalid month should return null': function(test) {
      let rule = new schedule.RecurrenceRule({
        freq: RRule.YEARLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 1,
        bymonth: 13,
      });
      let next = rule.nextInvocationDate();
      test.equal(next, null);

      let rule2 = new schedule.RecurrenceRule({
        freq: RRule.YEARLY,
        bysecond: 0,
        byminute: 0,
        byhour: 0,
        bymonthday: 1,
        bymonth: 'asdfasdf',
      });
      const next2 = rule2.nextInvocationDate(next);
      test.equal(next2, null);

      test.done();
    },
    'nextInvocationDate on an invalid second should return null': function(test) {
      let rule = new schedule.RecurrenceRule();
      rule.second = 60;
      let next = rule.nextInvocationDate();
      test.equal(next, null);

      let rule2 = new schedule.RecurrenceRule();
      rule2.second = 'asdfasdf';
      const next2 = rule2.nextInvocationDate();
      test.equal(next2, null);

      test.done();
    },
    'nextInvocationDate on an invalid hour should return null': function(test) {
      let rule = new schedule.RecurrenceRule();
      rule.hour = 24;
      let next = rule.nextInvocationDate();
      test.equal(next, null);

      let rule2 = new schedule.RecurrenceRule();
      rule2.hour = 'asdfasdf';
      const next2 = rule2.nextInvocationDate();
      test.equal(next2, null);

      test.done();
    },
    'nextInvocationDate on an invalid date should return null': function(test) {
      let rule = new schedule.RecurrenceRule();
      rule.date = 90;
      let next = rule.nextInvocationDate();
      test.equal(next, null);

      // Test February
      let rule2 = new schedule.RecurrenceRule();
      rule2.month = 1;
      rule2.date = 30;
      const next2 = rule2.nextInvocationDate();
      test.equal(next2, null);

      let rule3 = new schedule.RecurrenceRule();
      rule3.date = 'asdfasdf';
      const next3 = rule3.nextInvocationDate();
      test.equal(next3, null);

      test.done();
    },
    'nextInvocationDate on an invalid dayOfWeek should return null': function(test) {
      let rule = new schedule.RecurrenceRule();
      rule.dayOfWeek = 90;
      let next = rule.nextInvocationDate();
      test.equal(next, null);

      let rule2 = new schedule.RecurrenceRule();
      rule2.dayOfWeek = 'asdfasdf';
      const next2 = rule.nextInvocationDate();
      test.equal(next2, null);

      test.done();
    },
  },
};
