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

schedule.scheduleJob('job XYZ', new Date(new Date().getTime() + 3000), function(d) {
  console.log(d);
});

schedule.scheduleJob(
  'job ABC',
  'DTSTART:20200815T092630\nRRULE:FREQ=SECONDLY;INTERVAL=1;WKST=MO',
  function(d) {
    console.log(d);
  }
);

schedule.scheduleJob('job XXX', test, function(d) {
  console.log(d);
});
