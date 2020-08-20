# WORK IN PROGRESS

**Do not use this library yet. It's functional, but alot remains until it's production ready.**

- [ ] Update test suite to comply with RRule instead of cron
- [x] Update the documentation
- [x] Schedule jobs via object literal and RRule/RRuleSet
- [ ] Support for RRuleSet
- [ ] Performance testing/optimizing
- [ ] Ensure that timezones are handled correctly by RRule (we might need rrule-tz)

# Node Schedule RRule

This is an RRule version of Matt Patenaude's [node-schedule](https://github.com/node-schedule/node-schedule) (now maintained by Tejas Manohar).

The very nice core of Matt's library is kept in order to handle many scheduled jobs with only one timer.

This version has no cron functionality whatsoever. Dependencies on **cron-parser** and **cron-date** is exchanged for dependency on **rrule**.

Just like its' parent library, Node Schedule RRule is for time-based scheduling, not interval-based scheduling. While you can easily bend it to your will, if you only want to do something like "run this function every 5 minutes", you'll find `setInterval` much easier to use, and far more appropriate. But if you want to, say, "run this function at the :20
and :50 of every hour on the third Tuesday of every month," you'll find that Node Schedule RRule suits your needs better.

## Why an RRule version?

RRule is a neat way to store recurrence definitions for use in iCal compatible applications. If you have iCal recurrances at the client side and need to trigger actions at the server for the very same recurrences (sending reminders etc) you will probably be better of using an RRule parser at the server instead of trying to convert your iCal stuff to cron stuff. Many times this isn't even possible because rrule can describe more complicated recurrences than cron.

There are a couple of rrule libraries for javascript. The one we use is currently the most used ([rrule](https://www.npmjs.com/package/rrule)). The rrule library implements most of the iCal standard, even VEvents can be constructed via RRuleSet, i.e. a set of RRule, explicit dates and exclusions of those (e.g. repeat every friday, but not on Christmas eve).

## Terminology and the concept in this library

When a **job** is created (either via `new Job()` or via `scheduleJob()`), this job is placed in an internal job list. Each job has a **rule** for calculating the next invocation time. In node-schedule-rrule, this rule is an RRule or RRuleSet (Can also be plain Date objects).

An internal list, **pendingInvocations**, is kept populated with the next planned **invocation** for each job. When it's time for a planned invocation to be **invoked** the provided callback function for the related job will be called. The callback will be given an object consisting of the **invocationDate**, **lastInvocationDate** and an **invocationCounter**. There will also be an event emitted. The next upcoming invocation is calculated for the same job and put in the pendingInvocations list so it's ready when time comes.

## Caveats

RRule-calculations are a bit more involved than cron-calculations, therefore RRule is well suited for calendar occurrences which often has an occurence-count of 10:s or 100:s, whereas cron is more suited for scheduling tasks server-side where occurrence count can be hudreds of thousands. In the calendar use case we might need to look at both past and future occurrences (when the user browses the calendar). In the server use case we only need to look forward.

Even though we only need to look forward, rrule.js has to iterate all the way from the start date (dtstart) every time in order to calculate the next occurrence. This can be a real bottleneck for rules with a massive amount of occurences, for example where frequence is "every second". There is a concept of cache in rrule.js, but it doesn't seem to cover out use case. Please chime in if you know otherwise.

In order to handle this bottleneck **node-schedule-rrule** pushes the start date (dtstart) of each RRule forward regularly in order to shorten the tail with occurrences we are not interested in. Altering dtstart needs to be done in a safe maner without compromising the rules, i.e. we cannot simply reset dtstart to `new Date()` without considering the rules.

## Usage

### Installation

```
npm install node-schedule-rrule
```

### Overview

### Scheduling jobs

To schedule a job you can either create a Job manually and call schedule on it like this.

```js
const schedule = require('node-schedule-rrule');

const job1 = new schedule.Job(
  //An optional job name makes it easy to work with the job later on
  'Job name',

  //Function to be called upon invocation
  function(invocationData) {
    console.log(invocationData);
  }
);

job1.schedule('FREQ=SECONDLY');
```

You can also use the convenience function `scheduleJob`

```js
const {scheduleJob} = require('node-schedule-rrule');

const job1 = scheduleJob('Job name', 'FREQ=SECONDLY', function(invocationData) {
  console.log(invocationData);
});
```

The rule input for a job can be one of the following:

- an iCal RFC compliant rrule string
- an RRule object literal
- a precreated RRule or RRuleSet
- A Date object or an aray of Date objects (this has nothing to do with RRule, but is provided as a convenience)

### iCal RFC string

You can easily generate iCal strings with the rrule demo app: http://jakubroztocil.github.io/rrule/

N.B: if the demo app gives you a multiline iCal string you need to insert a newline char in the string, i.e. `\n`

Example:

```js
const {schedulejob} = require('node-schedule-rrule');

scheduleJob('DTSTART:20200815T092630\nRRULE:FREQ=SECONDLY;INTERVAL=1;WKST=MO;BYSECOND=30', function(
  invocationData
) {
  console.log('This will be logged every half minute, when the second hand is at 30');
});
```

RRule also supports the BYSETPOS attribute, which makes it possible to schedule tasks for the last workday every month.

```js
const {schedulejob} = require('node-schedule-rrule');

const j = scheduleJob(
  'DTSTART:20200901T090000Z\nRRULE:FREQ=MONTHLY;INTERVAL=1;WKST=MO;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
  function(invocationData) {
    console.log('This will be logged the last workday every month');
  }
);
```

### Object Literal Syntax

You'll need to install the rrule library if you want to use the RRule constants.

```js
const schedule = require('node-schedule-rrule');
const {RRule} = require('rrule');

const options = {
  freq: RRule.MONTHLY,
  dtstart: new Date(Date.UTC(2020, 8, 1, 9, 0, 0)),
  interval: 1,
  byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
  bysetpos: [-1],
};

const j = schedule.scheduleJob(options, function() {
  console.log('This will be logged the last workday every month');
});
```

### Handle Jobs and Job Invocations

There are some function to get information for a Job and to handle the Job and
Invocations.

#### job.cancel(reschedule)

You can invalidate any job with the `cancel()` method:

```js
j.cancel();
```

All planned invocations will be canceled. When you set the parameter **_reschedule_**
to true then the Job is newly scheduled afterwards.

#### job.cancelNext(reschedule)

This method invalidates the next planned invocation or the job.
When you set the parameter **_reschedule_** to true then the Job is newly scheduled
afterwards.

#### job.reschedule(spec)

This method cancels all pending invocation and registers the Job completely new again using the given specification.
Return true/false on success/failure.

#### job.nextInvocation()

This method returns a Date object for the planned next Invocation for this Job. If no invocation is planned the method returns null.

## Copyright and license

Core functionality: Copyright 2015 Matt Patenaude.

RRule implementation: Copyright 2020 Michael Sageryd

Licensed under the **[MIT License][license]**.

## Repo

Instead of just copying the original code and start over I've left this repo as a fork in order to keep the credits where credits are due. That said, I have cleaned up the repo somewhat by removing old branches and tags. From now on I intend to create a git tag for every published NPM version.

## Links

[Brian Moeskau on recurrences](https://github.com/bmoeskau/Extensible/blob/master/recurrence-overview.md)

[RRule](https://github.com/jakubroztocil/rrule)

[RRule demo](http://jakubroztocil.github.io/rrule/)

[iCalendar.org](https://icalendar.org/iCalendar-RFC-5545/3-3-10-recurrence-rule.html)
