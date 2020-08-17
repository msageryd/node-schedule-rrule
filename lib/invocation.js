function Invocation(job, fireDate, endDate) {
  this.job = job;
  this.fireDate = fireDate;
  this.endDate = endDate;
  this.timerID = null;
}

module.exports = Invocation;
