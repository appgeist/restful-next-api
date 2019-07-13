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
 * @param {Object} handlers Restful API request handlers config
 * @param {Object} handlers.GET Config object describing how GET requests are processed
 * @param {import('yup').ObjectSchema} handlers.GET.querySchema Yup schema to validate the query of GET requests
 * @param {RequestHandlerFunction} handlers.GET.handleRequest Method to process the GET requests
 * @param {Object} handlers.PUT Config object describing how PUT requests are processed
 * @param {import('yup').ObjectSchema} handlers.PUT.querySchema Yup schema to validate the query of PUT requests
 * @param {import('yup').ObjectSchema} handlers.PUT.bodySchema Yup schema to validate the body of PUT requests
 * @param {RequestHandlerFunction} handlers.PUT.handleRequest Method to process the PUT requests
 * @param {Object} handlers.POST Config object describing how POST requests are processed
 * @param {import('yup').ObjectSchema} handlers.POST.querySchema Yup schema to validate the query of POST requests
 * @param {import('yup').ObjectSchema} handlers.POST.bodySchema Yup schema to validate the body of POST requests
 * @param {RequestHandlerFunction} handlers.POST.handleRequest Method to process POST requests
 * @param {Object} handlers.PATCH Config object describing how PATCH requests are processed
 * @param {import('yup').ObjectSchema} handlers.PATCH.querySchema Yup schema to validate the query of PATCH requests
 * @param {import('yup').ObjectSchema} handlers.PATCH.bodySchema Yup schema to validate the body of PATCH requests
 * @param {RequestHandlerFunction} handlers.PATCH.handleRequest Method to process PATCH requests
 * @param {Object} handlers.DELETE Config object describing how DELETE requests are processed
 * @param {import('yup').ObjectSchema} handlers.DELETE.querySchema Yup schema to validate the query of DELETE requests
 * @param {RequestHandlerFunction} handlers.DELETE.handleRequest Methos to process DELETE requests
 */
module.exports = handlers => async (req, res) => {
  try {
    const { method } = req;
    const handlerSpec = handlers[method];
    if (!handlerSpec) throw new ApiError(METHOD_NOT_ALLOWED);
    const { querySchema, bodySchema, handleRequest } = handlerSpec;

    let { query, body } = req;
    if (isSchema(querySchema) || isSchema(bodySchema)) {
      ({ query, body } = await object({
        query: querySchema,
        body: bodySchema
      }).validate({ query, body }, { abortEarly: false }));
    }

    const result = await handleRequest({ query, body, req });
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
