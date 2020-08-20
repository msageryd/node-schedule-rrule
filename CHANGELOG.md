# Changelog

## 0.9.3

- Test suite from node-schedule migrated to node-schedule-rrule. All tests are passing

- Job.cancelNext removed (almost same behaviour can be achieved with Job.cancel)

- Support for "one-shots". i.e. schedule with just a Date object

  The one-shot API will change before v1.0 so it can take a Date array, or schedule more dates for an existing job. Needed simple one-shots to complete test suite.

## 0.9.2

- More input options for Job.schedule (RRule object, RRule options object, iCal string)

- Refactoring. "Classes" moved to separate modules

- Dependencies updated. `npm audit` shows zero vulnerabilities

- Code cleanup, unused functions removed

- Eslint, bumped ecmaVersion to 2018 to get rid of some false lint errors

## 0.9.1

- Documentation updated

## 0.9.0

- First commit with RRule support

- Cron dependencies removed
