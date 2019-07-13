# [@appgeist/restful-next-api](https://github.com/appgeist/restful-next-api)

[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]

Build restful [API methods for Next.js > 9](https://nextjs.org/docs#api-routes) and validate the incoming requests with [yup](https://www.npmjs.com/package/yup).

## Why

[Next.js brought API routes support in v9](https://nextjs.org/docs#api-routes), but you have to provide your own implementation of handling different rest methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). This helper enables you to clearly structure your method handling and validation.

## Installation

- Install with `npm i @appgeist/restful-next-api` or `yarn add @appgeist/restful-next-api`;
- Run `npx install-peerdeps -do @appgeist/restful-next-api` to make sure you have the necessary `peerDependencies` (`yup` and `http-status-codes`) in your project.

## Usage examples

In `/pages/api/products.js`:

```js
import { object, number, string } from "yup";
import { rest } from "@appgeist/restful-next-api";
import { Product, User } from "~/models";
import { log } from "~/utils";

export default rest({
  GET: {
    querySchema: object({
      page: number()
        .integer()
        .positive()
        .required()
    }),

    handleRequest: ({ query: { page } }) => Product.browse({ page })
  },

  POST: {
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

    handleRequest: async ({ body, req }) => {
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
import { rest } from "@appgeist/restful-next-api";
import { Product } from "~/models";
import { log } from "~/utilities";

export default rest({
  PATCH: {
    querySchema: object({
      id: number()
        .integer()
        .positive()
        .required()
    }),
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

    handleRequest: async ({ body, req }) => {
      const product = await Product.create(body);
      await log(
        `Product ${product.id} updated at ${new Date()} by user ${req.userId}`
      );
      return product;
    }
  },

  DELETE: {
    querySchema: object({
      id: number()
        .integer()
        .positive()
        .required()
    }),

    handleRequest: async ({ query: { id }, req }) => {
      const { userId } = req;
      const acl = await User.getACL(userId);
      if (!acl.includes("deleteProduct")) throw new ApiError(FORBIDDEN);
      await Product.destroy(id);
      await log(`Product ${id} deleted at ${new Date()} by user ${userId}`);
    }
  }
});
```

JsDocs are provided for improved IDE support.

## Request flow

1. The data for each request is validated (and transformed) according to the `querySchema` and `bodySchema` definitions. See `yup` [readme](https://github.com/jquense/yup) for more information on data validation and transformation.

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

   - If validation succeeds, the `handleRequest` method will be invoked.

2. The `handleRequest` method:

   ```js
   handleRequest({ query, body, req }) => { /* ... */ };
   ```

   This method can return an object or a Promise resolving to an object that will be serialized to `JSON` and sent back to the client with a `200` (`OK`) status code. If `handleRequest` returns `undefined` or `null`, an empty response will be sent with a `201` (`CREATED`) header for `POST` requests and `204` (`NO_CONTENT`) for non-`POST` request.

   If `handleRequest` throws an `ApiError` (exported by `@appgeist/restful-next-api`), a specific http status code is returned to the client. For instance, the following code will result in a `404` (`NOT_FOUND`) being sent to the client:

   ```js
   import { ApiError } from '@appgeist/restful-next-api';
   import { NOT_FOUND } from 'http-status-codes';

   handleRequest() => {
     // ...
     throw new ApiError(NOT_FOUND);
     // ...
   }
   ```

   Other error types are treated as `500` / `INTERNAL_SERVER_ERROR` and are logged to the console.

## License

The [ISC License](LICENSE).

[npm-image]: https://img.shields.io/npm/v/@appgeist/restful-next-api.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@appgeist/restful-next-api
[license-image]: https://img.shields.io/npm/l/@appgeist/restful-next-api.svg?style=flat-square
[license-url]: LICENSE
