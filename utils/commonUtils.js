const monthMap = {
  "january": 0, "february": 1, "march": 2, "april": 3,
  "may": 4, "june": 5, "july": 6, "august": 7,
  "aeptember": 8, "october": 9, "november": 10, "december": 11
};

module.exports = {
  /**
   * Rounds the given number upto the given decimal places.
   * @param {number} num number to be rounded
   * @param {number} scale decimal places upto which to round
   * @returns 
   */
  Round: (num, scale) => {
    if (typeof num !== 'number' || typeof scale !== 'number') {
      throw new TypeError('Both num and scale should be numbers');
    }

    const numString = num + 'e' + scale;
    const roundedString = Math.round(numString) + 'e-' + scale;
    return Number(roundedString);
  },
 
  /**
   * Helper function to map month names to numbers for comparison
   * @param {*} month month to convert to a zero-based index (e.g., 0 for January, 1 for February, ..., 11 for December)
   * @returns 
   */
  MonthToNumber: (month) => {
    if (!month) throw new Error('Month argument null.'); 
    return monthMap[month.toLowerCase()];
  }
}