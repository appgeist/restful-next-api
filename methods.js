const {
  INTERNAL_SERVER_ERROR,
  METHOD_NOT_ALLOWED,
  CREATED,
  NO_CONTENT,
  BAD_REQUEST,
  getStatusText
} = require('http-status-codes');
const { object, isSchema, ValidationError } = require('yup');

const ApiError = require('./ApiError');

/**
 * Build restful API request handlers
 *
 * @param {Object} options Restful API request handlers config
 * @param {RequestHandlerFunction|QueryMethodOptions} options.get Config object describing
 *    how GET requests are processed
 * @param {RequestHandlerFunction|QueryAndBodyMethodOptions} options.post Config object describing
 *    how POST requests are processed
 * @param {RequestHandlerFunction|QueryAndBodyMethodOptions} options.put Config object describing
 *    how PUT requests are processed
 * @param {RequestHandlerFunction|QueryAndBodyMethodOptions} options.patch Config object describing
 *    how PATCH requests are processed
 * @param {RequestHandlerFunction|QueryMethodOptions} options.delete Config object describing
 *    how DELETE requests are processed
 */
module.exports = options => async (req, res) => {
  try {
    const methodName = req.method.toLowerCase();
    const method = options[methodName];

    if (!method) throw new ApiError(METHOD_NOT_ALLOWED);

    let { query, body } = req;

    const handler = typeof method === 'function' ? method : method.handler;
    const { querySchema, bodySchema } = method;

    if (isSchema(querySchema) || isSchema(bodySchema)) {
      ({ query, body } = await object({
        query: querySchema,
        body: bodySchema
      }).validate({ query, body }, { abortEarly: false }));
    }

    const result = await handler({ query, body, req });

    if (result === undefined || result === null) {
      res.status(method === 'POST' ? CREATED : NO_CONTENT).send(null);
    } else {
      res.send(result);
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      const { message, errors } = err;
      res.status(BAD_REQUEST).send({ message, errors });
    } else if (err instanceof ApiError) {
      const { message } = err;
      res.status(err.httpStatusCode).send({ message });
    } else {
      // eslint-disable-next-line no-console
      console.log(err.stack);
      res.status(INTERNAL_SERVER_ERROR).send({ message: getStatusText(INTERNAL_SERVER_ERROR) });
    }
  }
};

/**
 * @typedef {Object} QueryMethodOptions
 * @property {import('yup').ObjectSchema} options.get.querySchema Yup schema to validate the request query
 * @property {RequestHandlerFunction} options.get.handler Request handler
 */

/**
 * @typedef {Object} QueryAndBodyMethodOptions
 * @property {import('yup').ObjectSchema} options.get.querySchema Yup schema to validate the request query
 * @property {import('yup').ObjectSchema} options.get.bodySchema Yup schema to validate the request body
 * @property {RequestHandlerFunction} options.get.handler Request handler
 */

/**
 * @callback RequestHandlerFunction
 * @param {RequestHandlerFunctionParameters} options Request handler parameters
 * @returns {Object|Promise<Object>}
 */

/**
 * @typedef {Object} RequestHandlerFunctionParameters
 * @property {Object} query Request query
 * @property {Object} body Request body
 * @property {Object} req Request object
 */
