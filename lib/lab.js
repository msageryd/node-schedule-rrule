'use strict';

const schedule = require('./schedule');
const {RRule, RRuleSet, rrulestr} = require('rrule');

const test = new RRule({
  freq: RRule.SECONDLY,
  count: 5,
  dtstart: new Date(),
  interval: 1,
});

schedule.scheduleJob('job RST', test, function(d) {
  console.log(d);
});

schedule.scheduleJob(
  'job XYZ',
  {
    dtstart: new Date(Date.UTC(2020, 8, 17, 19, 28, 20)),
    freq: RRule.SECONDLY,
    interval: 2,
    count: 5,
  },
  function(d) {
    console.log(d);
  }
);

schedule.scheduleJob(
  'job ABC',
  'DTSTART:20200815T092630\nRRULE:FREQ=SECONDLY;INTERVAL=1;WKST=MO',
  function(d) {
    console.log(d);
  }
);
