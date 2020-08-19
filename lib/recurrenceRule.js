const {RRule, RRuleSet, rrulestr} = require('rrule');
const DTSTART_RESET_LIMIT = 3;

/* RecurrenceRule object */
/*
  Using rrule library to parse rrule strings or rrule objects

  rule can be an rrule string (iCal rfc or an rrule options object
  input is parsed with rrule.rrulestr()
*/
function RecurrenceRule(rule) {
  if (!rule) return;

  //Counter for deciding when to reset dtstart
  this.iterations = 0;

  const isRRule = rule instanceof RRule || rule instanceof RRuleSet;

  if (rule instanceof Date) {
    this.oneShot = rule;
    this.start = rule;
    this.end = rule;
    this.rule = null;
  } else if (rule instanceof RRule || rule instanceof RRuleSet) {
    this.rule = rule;
  } else if (typeof rule === 'string' || rule instanceof String) {
    try {
      this.rule = rrulestr(rule, false); //Returns an RRule or an RRuleSet, cache=false
    } catch (e) {
      throw new Error(
        'Invalid iCal string. Could not parse RRule from string. Rule must be an iCal string, an RRule options object, an RRule/RRuleSet or a Date'
      );
    }
  } else if (typeof rule === 'object') {
    try {
      this.rule = new RRule(rule, true); //noCache=true
    } catch (e) {
      throw new Error(
        'Invalid object literal. Could not parse RRule from object. Rule must be an iCal string, an RRule options object, an RRule/RRuleSet or a Date'
      );
    }
  } else {
    throw new Error(
      'Invalid input. Rule must be an iCal string, an RRule options object, an RRule/RRuleSet or a Date'
    );
  }

  if (this.rule) {
    this.safelyResetStartDate();
    this.start = this.rule.options.dtstart;
    this.end = this.rule.options.until;
  }
}

RecurrenceRule.prototype.isValid = function() {
  return (
    this.rule instanceof RRule || this.rule instanceof RRuleSet || this.oneShot instanceof Date
  );
};

RecurrenceRule.prototype.nextInvocationDate = function(base) {
  if (!this.isValid()) {
    return null;
  }
  base = base || new Date();
  this.iterations++;

  if (this.oneShot) {
    const next = this.oneShot.getTime() >= base.getTime() ? this.oneShot : null;
    if (next) {
      this.oneShotDone = next;
      this.oneShot = null;
      return next;
    }
  } else if (this.rule) {
    const next = this.rule.after(base);
    return this.rule.after(base);
  }

  return null;
};

RecurrenceRule.prototype.safelyResetStartDate = function() {
  if (!this.rule) return;

  if (this.iterations % DTSTART_RESET_LIMIT === 0) {
    //Reset dtstart to get rid of unneeded history. RRule.after() takes a conciderable
    //performance hit if dtstart is many occurances back in time
    //https://github.com/jakubroztocil/rrule/issues/407

    const newDTstart = calcSafeDTstart(this.rule);
    if (newDTstart) {
      // console.log(`Resetting dtstart from ${this.rule.options.dtstart} to ${newDTstart}`);

      this.rule = new RRule({
        ...this.rule.options,
        dtstart: newDTstart,
      });
    }
  }
};

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

module.exports = RecurrenceRule;
