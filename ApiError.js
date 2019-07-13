const { getStatusText } = require('http-status-codes');

module.exports = class ApiError extends Error {
  /**
   * Creates an instance of ApiError
   *
   * @param {Object} options
   * @param {number} options.code HTTP status code to respond with
   * @param {string} options.message Custom message to respond with, defaults to standard message
   *    for the provided code, as defined by [http-status-codes](https://www.npmjs.com/package/http-status-codes)
   */
  constructor({ status = 500, message }) {
    super(message || getStatusText(status));
    this.name = this.constructor.name;
    this.httpStatusCode = status;
  }
};
