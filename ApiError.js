const { INTERNAL_SERVER_ERROR, getStatusText } = require('http-status-codes');

module.exports = class ApiError extends Error {
  /**
   * Creates an instance of ApiError
   *
   * @param {number|ApiErrorOptions} [options] HTTP status code to respond with (defaults to 500), or an object
   *    with code and message properties
   */
  constructor(options) {
    let status;
    let message;
    if (typeof options === 'object') {
      ({ status, message } = options);
      if (!message) message = getStatusText(status);
    } else if (typeof options === 'number') {
      status = options;
      message = getStatusText(status);
    } else {
      status = INTERNAL_SERVER_ERROR;
      message = getStatusText(INTERNAL_SERVER_ERROR);
    }
    super(message);
    this.name = this.constructor.name;
    this.httpStatusCode = status;
  }
};

/**
 * @typedef {Object} ApiErrorOptions
 * @property {number} status HTTP status code to respond with
 * @property {string} message Custom message to respond with, defaults to standard message
 *    for the provided code, as defined by [http-status-codes](https://www.npmjs.com/package/http-status-codes)
 */
