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
    const monthMap = {
      "January": 0, "February": 1, "March": 2, "April": 3,
      "May": 4, "June": 5, "July": 6, "August": 7,
      "September": 8, "October": 9, "November": 10, "December": 11
    };
    return monthMap[month];
  }
}