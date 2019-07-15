const { getStatusText } = require('http-status-codes');

module.exports = class ApiError extends Error {
  /**
   * Creates an instance of ApiError
   *
   * @param {number|ApiErrorOptions} options HTTP status code to respond with (defaults to 500), or an object
   *    with code and message properties
   */
  constructor(options) {
    const status = typeof options === 'number' ? options : options.status || 500;
    super(options.message || getStatusText(status));
    this.name = this.constructor.name;
    this.httpStatusCode = status;
  }
};

/**
 * @typedef {Object} ApiErrorOptions
 * @property {number} code HTTP status code to respond with
 * @property {string} message Custom message to respond with, defaults to standard message
 *    for the provided code, as defined by [http-status-codes](https://www.npmjs.com/package/http-status-codes)
 */
