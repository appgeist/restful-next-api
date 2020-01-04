# @appgeist/restful-next-api

[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]

![AppGeist Restful Next.js API](https://user-images.githubusercontent.com/581999/61737683-6782cf80-ad91-11e9-8c7d-703b9f6c7b9b.png)

Build restful [API methods for Next.js > 9](https://nextjs.org/docs#api-routes) and validate the incoming requests with [yup](https://www.npmjs.com/package/yup).

## Why

[Next.js brought API routes support in v9](https://nextjs.org/docs#api-routes), but you have to provide your own implementation of handling different rest methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). This helper enables you to clearly structure your method handling and validation.

## Installation

- Install with `npm i @appgeist/restful-next-api` or `yarn add @appgeist/restful-next-api`;
- Run `npx install-peerdeps -do @appgeist/restful-next-api` to make sure you have the necessary `peerDependencies` (`yup`, `http-status-codes` and of course `next`) in your project.

## Usage example

In `/pages/api/products.js`:

```js
import { object, number, string } from "yup";
import methods from "@appgeist/restful-next-api";
import { Product, User } from "~/models";
import { log } from "~/utils";

export default methods({
  get: ({ query: { page } }) => Product.browse({ page }),

  post: {
    bodySchema: object({
      name: string()
        .min(5)
        .max(20)
        .required(),
      description: string()
        .min(5)
        .max(1000),
      price: number()
        .positive()
        .max(9999)
        .required(),
      inventoryItems: number()
        .integer()
        .positive()
        .max(999)
        .required()
    }).noUnknown(),

    onRequest: async ({ body, req }) => {
      const product = await Product.create(body);
      await log(
        `Product ${product.id} created at ${new Date()} by user ${req.userId}`
      );
      return product;
    }
  }
});
```

In `/pages/api/products/[id].js`:

```js
import { object, number, string } from "yup";
import { FORBIDDEN } from "http-status-codes";
import methods, { ApiError } from "@appgeist/restful-next-api";
import { Product } from "~/models";
import { log } from "~/utilities";

export default methods({
  patch: {
    querySchema: {
      id: number()
        .integer()
        .positive()
        .required()
    },

    bodySchema: object({
      name: string()
        .min(5)
        .max(20)
        .required(),
      description: string()
        .min(5)
        .max(1000),
      price: number()
        .positive()
        .max(9999)
        .required(),
      inventoryItems: number()
        .integer()
        .positive()
        .max(999)
        .required()
    }).noUnknown(),

    onRequest: async ({ body, req }) => {
      const product = await Product.create(body);
      await log(
        `Product ${product.id} updated at ${new Date()} by user ${req.userId}`
      );
      return product;
    }
  },

  delete: {
    querySchema: {
      id: number()
        .integer()
        .positive()
        .required()
    },

    onRequest: async ({ query: { id }, req }) => {
      const { userId } = req;
      const acl = await User.getACL(userId);
      if (!acl.includes("deleteProduct")) throw new ApiError(FORBIDDEN);
      await Product.destroy(id);
      await log(`Product ${id} deleted at ${new Date()} by user ${userId}`);
    }
  }
});
```

Each method can be:

- a request handler function (see details below)
- an object shaped like so: `{ querySchema, bodySchema, handler, errorHandler }`.

A `querySchema`/`bodySchema` definition can be:

- a simple JS object for brevity (the object will be converted automatically to a yup schema)
- a yup schema (for complex scenarios when you need to add a `.noUnknown()` modifier)

## Request flow

1. For each request, the `beforeRequest` handler is invoked if present:

   ```js
   import methods from "@appgeist/restful-next-api";

   export default methods({
     get: {
       beforeRequest: () => {
         console.log('Before GET');
       },
       onRequest: () => {
         console.log('On GET request');
       },
     },

     delete: () => {
       console.log('On DELETE request');
     },

     beforeRequest: () => {
       // ...
       console.log('Before REQUEST');
       // ...
     }
   });
   ```

2. If `beforeRequest` completes without throwing an error, the data for each request is validated (and transformed) according to the specified `querySchema` and `bodySchema` definitions. See `yup` [readme](https://github.com/jquense/yup) for more information on data validation and transformation.

   - **If validation fails, the request handler invocation is skipped** and a `400` (`BAD_REQUEST`) response is sent to the client with a `JSON` body type structured like so:

   ```json
   {
     "message": "There were 2 validation errors",
     "errors": [
       "body.price must be an integer",
       "body.inventoryItems is required"
     ]
   }
   ```

   - If validation succeeds, the `onRequest` handler will be invoked.

3. The `onRequest` handler:

   ```js
   function onRequest({ query, body, req }) => { /* do work and return data */ };
   ```

   ...or

   ```js
   async function onRequest({ query, body, req }) => { /* do work and return Promise which resolves to data */ };
   ```

   This method can return an object or a Promise resolving to an object that will be serialized to `JSON` and sent back to the client with a `200` (`OK`) status code. If `onRequest` returns `undefined` or `null`, an empty response will be sent with a `201` (`CREATED`) header for `POST` requests and `204` (`NO_CONTENT`) for non-`POST` request.

4. Default error handling

   If `beforeRequest` or `onRequest` throws an `ApiError` (also exported by `@appgeist/restful-next-api`), a specific http status code is returned to the client. For instance, the following code will result in a `403` (`FORBIDDEN`) being sent to the client:

   ```js
   import methods, { ApiError } from "@appgeist/restful-next-api";
   import { FORBIDDEN } from "http-status-codes";

   export default methods({
     get: {
       // ...
       onRequest: () => {
         // ...
         throw new ApiError(FORBIDDEN);
         // ...
       }
       // ...
     }
   });
   ```

   Other error types are treated as `500` / `INTERNAL_SERVER_ERROR` and are also logged to the console.

## Custom error handling

You can override the default error handling mechanism by providing a custom error handling function like so:

```js
export default methods({
  patch: {
    // querySchema: ..., bodySchema: ...,
    onRequest: ({ body, req }) => {
      /* handle patch request */
    },

    // Error handler for patch requests
    onError: ({ res, err }) => {
      res.status(500).send("Error while trying to patch");
    }
  },

  delete: {
    // querySchema: ...,
    onRequest: ({ query: { id }, req }) => {
      /* handle delete request */
    }
  },

  // Generic error handler - this will also handle errors for delete requests
  onError: ({ res, err }) => {
    res.status(500).send("Error");
  }
});
```

A specific method error handler takes precedence over the generic error handler.

## IDE support

JsDocs are provided for IDE support for now; an `index.d.ts` will be provided at some point in the future.

## License

The [ISC License](LICENSE).

[npm-image]: https://img.shields.io/npm/v/@appgeist/restful-next-api.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@appgeist/restful-next-api
[license-image]: https://img.shields.io/npm/l/@appgeist/restful-next-api.svg?style=flat-square
[license-url]: LICENSE
