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
 * @param {RequestHandlerFunction|QueryMethodOptions} options.get Request handler or
 *    config object describing how GET requests are processed
 * @param {RequestHandlerFunction|QueryAndBodyMethodOptions} options.post Request handler or
 *    config object describing how POST requests are processed
 * @param {RequestHandlerFunction|QueryAndBodyMethodOptions} options.put Request handler or
 *    config object describing how PUT requests are processed
 * @param {RequestHandlerFunction|QueryAndBodyMethodOptions} options.patch Request handler or
 *    config object describing how PATCH requests are processed
 * @param {RequestHandlerFunction|QueryMethodOptions} options.delete Request handler or
 *    config object describing how DELETE requests are processed
 */
module.exports = options => async (req, res) => {
  try {
    const methodName = req.method.toLowerCase();
    const method = options[methodName];

    if (!method) throw new ApiError(METHOD_NOT_ALLOWED);

    let { query, body } = req;

    const handler = typeof method === 'function' ? method : method.handler;
    const { querySchema, bodySchema } = method;

    if (querySchema || bodySchema) {
      ({ query, body } = await object({
        query: isSchema(querySchema) ? querySchema : object(querySchema),
        body: isSchema(bodySchema) ? bodySchema : object(bodySchema)
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
 * @property {Object} options.get.querySchema Schema to validate the request query.
 *    Can be:
 *      - a plain JS object for brevity (in which case it will be converted to a yup object)
 *      - a yup object for complex cases (i.e. when you need to add `.noUnknown()` modifier)
 * @property {RequestHandlerFunction} options.get.handler Request handler
 */

/**
 * @typedef {Object} QueryAndBodyMethodOptions
 * @property {Object} options.get.querySchema Schema to validate the request query.
 *    Can be:
 *      - a plain JS object for brevity (in which case it will be converted to a yup object)
 *      - a yup object for complex cases (i.e. when you need to add `.noUnknown()` modifier)
 * @property {Object} options.get.bodySchema Schema to validate the request body.
 *    Can be:
 *      - a plain JS object for brevity (in which case it will be converted to a yup object)
 *      - a yup object for complex cases (i.e. when you need to add `.noUnknown()` modifier)
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
