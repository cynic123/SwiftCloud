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
  }
}