const {RRule, RRuleSet, rrulestr} = require('rrule');

/* RecurrenceRule object */
/*
  Using rrule library to parse rrule strings or rrule objects

  rule can be an rrule string (iCal rfc or an rrule options object
  input is parsed with rrule.rrulestr()
*/
function RecurrenceRule(rule) {
  if (!rule) return;
  this.recurs = true;

  //Counter for deciding when to reset dtstart
  this.iterations = 0;

  rule = rrulestr(rule); //Returns an RRule or an RRuleSet
  this.rule = rule;
}

RecurrenceRule.prototype.isValid = function() {
  return this.rule instanceof RRule || this.rule instanceof RRuleSet;
};

RecurrenceRule.prototype.nextInvocationDate = function(base) {
  base = base || new Date();

  if (!this.recurs) {
    return null;
  }

  if (!this.isValid()) {
    return null;
  }
  return this.rule.after(base);
};

module.exports = RecurrenceRule;
