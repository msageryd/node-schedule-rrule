function Invocation(job, fireDate, recurrenceRule, endDate) {
  this.job = job;
  this.fireDate = fireDate;
  this.endDate = endDate;
  this.recurrenceRule = recurrenceRule || DoesntRecur;

  this.timerID = null;
}

module.exports = Invocation;
