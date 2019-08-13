const { METHOD_NOT_ALLOWED, CREATED, NO_CONTENT } = require('http-status-codes');
const { object, isSchema } = require('yup');

const ApiError = require('./ApiError');
const defaultErrorHandler = require('./defaultErrorHandler');

/**
 * Build restful API request handlers
 *
 * @param {Object} options Restful API request handlers config
 * @param {RequestHandlerFunction|MethodOptions} [options.get] Request handler function or
 *    config object describing how GET requests are processed
 * @param {RequestHandlerFunction|MethodOptions} [options.post] Request handler function or
 *    config object describing how POST requests are processed
 * @param {RequestHandlerFunction|MethodOptions} [options.put] Request handler function or
 *    config object describing how PUT requests are processed
 * @param {RequestHandlerFunction|MethodOptions} [options.patch] Request handler function or
 *    config object describing how PATCH requests are processed
 * @param {RequestHandlerFunction|MethodOptions} [options.delete] Request handler function or
 *    config object describing how DELETE requests are processed
 * @param {BeforeRequestHandlerFunction} [options.beforeRequest] Before request handler function
 * @param {ErrorHandlerFunction} [options.onError] Error handler function
 */
module.exports = options => async (req, res) => {
  const methodName = req.method.toLowerCase();
  const method = options[methodName];
  try {
    if (!method) throw new ApiError(METHOD_NOT_ALLOWED);

    let beforeRequestHandler;
    let requestHandler;

    if (typeof method === 'function') {
      beforeRequestHandler = options.beforeRequest;
      requestHandler = method;
    } else {
      const { beforeRequest, onRequest } = method;
      if (!onRequest) throw new ApiError(METHOD_NOT_ALLOWED);
      beforeRequestHandler = beforeRequest || options.beforeRequest;
      requestHandler = onRequest;
    }

    if (beforeRequestHandler) beforeRequestHandler(req);

    const { querySchema, bodySchema } = method;
    let { query, body } = req;

    if (querySchema || bodySchema) {
      ({ query, body } = await object({
        query: querySchema ? (isSchema(querySchema) ? querySchema : object(querySchema)) : undefined,
        body: bodySchema ? (isSchema(bodySchema) ? bodySchema : object(bodySchema)) : undefined
      }).validate({ query, body }, { abortEarly: false }));
    }

    const result = await requestHandler({ query, body, req });

    if (result === undefined || result === null) {
      res.status(method === 'POST' ? CREATED : NO_CONTENT).send(null);
    } else {
      res.json(result);
    }
  } catch (err) {
    const handleError = options.onError || method.onError || defaultErrorHandler;
    handleError({ err, res });
  }
};

/**
 * @typedef {Object} MethodOptions
 * @property {Object} querySchema Schema to validate the request query.
 *    Can be:
 *      - a plain JS object for brevity (in which case it will be converted to a yup object)
 *      - a yup object for complex cases (i.e. when you need to add `.noUnknown()` modifier)
 * @property {Object} bodySchema Schema to validate the request body.
 *    Can be:
 *      - a plain JS object for brevity (in which case it will be converted to a yup object)
 *      - a yup object for complex cases (i.e. when you need to add `.noUnknown()` modifier)
 * @property {BeforeRequestHandlerFunction} beforeRequest Before request handler function
 * @property {RequestHandlerFunction} onRequest Request handler function
 * @property {ErrorHandlerFunction} onError Error handler function
 */

/**
 * @callback BeforeRequestHandlerFunction
 * @param {import('next').NextApiRequest} req Request object
 */

/**
 * @callback RequestHandlerFunction
 * @param {RequestHandlerFunctionParameters} options Request handler function parameters
 * @returns {Object|Promise<Object>}
 */

/**
 * @typedef {Object} RequestHandlerFunctionParameters
 * @property {Object} query Request query
 * @property {Object} body Request body
 * @property {import('next').NextApiRequest} req Request object
 */

/**
 * @callback ErrorHandlerFunction
 * @param {ErrorHandlerFunctionParameters} options Error handler function parameters
 */

/**
 * @typedef {Object} ErrorHandlerFunctionParameters
 * @property {Object} err Error
 * @property {import('next').NextApiResponse} res Response object
 */
