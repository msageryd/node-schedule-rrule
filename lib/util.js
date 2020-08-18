function fireDateSorter(a, b) {
  return a.fireDate.getTime() - b.fireDate.getTime();
}

function isValidDate(date) {
  // Taken from http://stackoverflow.com/a/12372720/1562178
  // If getTime() returns NaN it'll return false anyway
  return date.getTime() === date.getTime();
}

module.exports = {
  fireDateSorter,
  isValidDate,
};
