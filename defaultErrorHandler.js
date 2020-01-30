const util = require('util');
const { INTERNAL_SERVER_ERROR, BAD_REQUEST, getStatusText } = require('http-status-codes');
const { ValidationError } = require('yup');

const ApiError = require('./ApiError');

module.exports = ({ err, res }) => {
  if (err instanceof ValidationError) {
    const { message, errors } = err;
    res.status(BAD_REQUEST).send({ message, errors });
  } else if (err instanceof ApiError) {
    const { status, message } = err;
    res.status(status).send({ message });
  } else {
    res.status(INTERNAL_SERVER_ERROR).send({ message: getStatusText(INTERNAL_SERVER_ERROR) });
    // eslint-disable-next-line no-console
    console.error(util.inspect(err, false, 5));
  }
};
