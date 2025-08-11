# `@tstdl/base/api`

The `@tstdl/base/api` module provides a powerful, type-safe framework for creating and consuming HTTP APIs. Its core principle is a "single source of truth": a shared API definition that is used to generate both the server-side controller stubs and a fully-typed client.

This approach eliminates boilerplate, reduces the risk of client-server desynchronization, and provides an excellent developer experience with full autocompletion and type-checking.

## Features

- **Type-Safe:** Define your API contract once with `@tstdl/base/schema` and get static type safety on both the client and server.
- **Declarative Definitions:** Clearly define resources, endpoints, methods, parameters, and response shapes in a single object.
- **Automatic Client Generation:** Use the `compileClient` function to create a ready-to-use, fully-typed client from your API definition. No code generation steps required.
- **Server-Side Framework:** A lightweight server framework built on decorators (`@apiController`) and dependency injection makes implementing API logic straightforward.
- **Middleware Support:** The server gateway includes a middleware pipeline for handling cross-cutting concerns like CORS, authentication, logging, and error handling.
- **Integrated Error Handling:** Throw standard `HttpError` subclasses (e.g., `NotFoundError`, `ForbiddenError`) on the server, and they will be automatically serialized and deserialized into the correct error types on the client.

## The Core Idea: The API Definition

The foundation of any API built with this module is the **API Definition**. This is a TypeScript object that describes the entire API surface, including its resources, endpoints, HTTP methods, and data schemas. It serves as the single source of truth for both the server and the client.

An API definition is created using the `defineApi` function.

### 1. Defining the API

First, create a shared file that can be accessed by both your server and client code. In this file, you'll define the API contract.

Here's an example of an API for managing `Device` entities.

`./source/shared/api/core/device.api.ts`

```typescript
import { defineApi } from '@tstdl/base/api';
import { array, object, string, enumeration, nullable } from '@tstdl/base/schema';
import { Device, DeviceType } from '#/shared/models/core/device.model.js';
import { DeviceView } from '#/shared/models/service-models/device.service-model.js';

// Export the type for easy use in controllers and clients
export type DeviceApiDefinition = typeof deviceApiDefinition;

export const deviceApiDefinition = defineApi({
  // The base resource path for this API
  resource: 'devices',
  endpoints: {
    // Defines a GET /devices/:id endpoint
    get: {
      resource: ':id', // Appended to the main resource path
      method: 'GET',
      parameters: object({
        id: string(),
      }),
      result: Device, // The response will be validated against the Device schema
      credentials: true, // Indicates that this endpoint requires authentication
    },

    // Defines a POST /devices endpoint
    create: {
      method: 'POST',
      parameters: object({
        type: enumeration(DeviceType),
        deviceNumber: string(),
        realEstateId: string(),
        unitId: nullable(string()),
      }),
      result: Device,
      credentials: true,
    },

    // Defines a GET /device-views?realEstateId=... endpoint
    getManyViews: {
      rootResource: 'device-views', // Overrides the base resource path
      parameters: object({
        realEstateId: string(),
      }),
      result: array(DeviceView),
      credentials: true,
    },
  },
});
```

### 2. Implementing the Server

With the definition in place, you can implement the server-side logic in a controller class.

#### API Controller

The `@apiController` decorator links your class to its corresponding API definition. Each method in the class maps to an endpoint key in the definition.

`./source/api/core/device.api.ts`

```typescript
import { apiController, type ApiRequestContext, type ApiServerResult } from '@tstdl/base/api/server';
import { ForbiddenError } from '@tstdl/base/errors';
import { inject } from '@tstdl/base/injector';
import { Uuid } from '@tstdl/base/orm';

import { DeviceService } from '#/services/core/index.js';
import { deviceApiDefinition, type DeviceApiDefinition } from '#/shared/api/core/index.js';
import type { VitrassToken } from '#/shared/token.js';

@apiController(deviceApiDefinition)
export class DeviceApi implements ApiController<DeviceApiDefinition> {
  // Services are easily injected
  readonly deviceService = inject(DeviceService);

  // Implementation for the 'get' endpoint
  async get({ parameters, getToken }: ApiRequestContext<DeviceApiDefinition, 'get'>): Promise<ApiServerResult<DeviceApiDefinition, 'get'>> {
    await getToken<VitrassToken>(); // Ensures user is authenticated and gets token
    return this.deviceService.load(parameters.id);
  }

  // Implementation for the 'create' endpoint
  async create({ parameters, getToken }: ApiRequestContext<DeviceApiDefinition, 'create'>): Promise<ApiServerResult<DeviceApiDefinition, 'create'>> {
    const token = await getToken<VitrassToken>();

    if (token.payload.tenantId === undefined) {
      throw new ForbiddenError('Tenant required');
    }

    return this.deviceService.insert({
      tenantId: token.payload.tenantId as Uuid,
      type: parameters.type,
      deviceNumber: parameters.deviceNumber,
      realEstateId: parameters.realEstateId,
      unitId: parameters.unitId,
      // ... other properties
    });
  }

  // ... other endpoint implementations
}
```

**`ApiRequestContext`**

Each endpoint handler receives a context object with:

- `parameters`: An object containing validated and merged URL parameters, query parameters, and (if applicable) JSON body properties.
- `body`: The raw request body if the endpoint definition specifies a `body` schema (e.g., for binary uploads).
- `request`: The underlying `HttpServerRequest` object.
- `getToken<T>()`: An async function to retrieve the authenticated token payload, provided by the `ApiRequestTokenProvider`.

#### Registering Controllers

Finally, register your controllers with the `ApiGateway` during your application's bootstrap process.

`./source/bootstrap.ts`

```typescript
import { configureApiServer } from '@tstdl/base/api/server';
import { AuthenticationApiController, AuthenticationApiRequestTokenProvider } from '@tstdl/base/authentication/server';
import { DeviceApi, RealEstateApi /* ... */ } from './api/core/index.js';

export async function bootstrap(): Promise<void> {
  // ... other application configurations

  configureApiServer({
    controllers: [
      AuthenticationApiController,
      DeviceApi,
      RealEstateApi,
      // ... other controllers
    ],
    requestTokenProvider: AuthenticationApiRequestTokenProvider, // Handles authentication
    gatewayOptions: {
      prefix: 'api', // All API routes will be prefixed with /api
      cors: {
        /* ... CORS options ... */
      },
    },
  });
}
```

### 3. Using the Client

The true power of the shared definition becomes apparent on the client side.

#### Client Compilation

Import the same API definition and use `compileClient` to generate a lightweight, type-safe client class.

`./client/api.ts`

```typescript
import { compileClient } from '@tstdl/base/api/client';
import { deviceApiDefinition } from '../shared/api/core/device.api.ts';

// Compile the client class from the definition
export const DeviceApi = compileClient(deviceApiDefinition);
```

#### Client Usage

Instantiate and use the client. All methods, parameters, and return types are fully typed, providing an excellent developer experience.

`./components/device-manager.ts`

```typescript
import { HttpClient } from '@tstdl/base/http';
import { inject } from '@tstdl/base/injector';
import { DeviceApi } from './client/api.ts'; // Import the compiled client

class DeviceManager {
  private readonly httpClient = inject(HttpClient); // Assuming HttpClient is configured
  private readonly deviceApi = new DeviceApi(this.httpClient);

  async getDeviceDetails(id: string): Promise<void> {
    try {
      // The `get` method expects an object with an `id` property.
      const device = await this.deviceApi.get({ id });

      // The `device` variable is fully typed as the `Device` class.
      console.log('Device Number:', device.deviceNumber);
    } catch (error) {
      // Errors are also typed (e.g., NotFoundError)
      console.error('Failed to fetch device:', error);
    }
  }

  async createNewDevice(): Promise<void> {
    const newDevice = await this.deviceApi.create({
      type: DeviceType.HeatCostAllocator,
      deviceNumber: '12345',
      realEstateId: 'uuid-of-real-estate',
      unitId: 'uuid-of-unit',
    });

    console.log('Created new device with ID:', newDevice.id);
  }
}
```

### Advanced Topics

#### Middleware

The server-side `ApiGateway` supports a middleware pipeline similar to Express or Koa. You can add custom middleware to handle tasks like logging, custom headers, or advanced authorization.

In `bootstrap.ts`:

```typescript
import { responseTimeMiddleware } from '@tstdl/base/api/server/middlewares';

configureApiServer({
  // ...
  gatewayOptions: {
    middlewares: [
      responseTimeMiddleware, // Adds an X-Response-Time header to all responses
    ],
    // ...
  },
});
```

#### Error Handling

The framework provides a set of standard error classes (e.g., `NotFoundError`, `ForbiddenError`, `BadRequestError`) that can be thrown from your controllers. The `ApiGateway` will automatically catch these errors and respond with the appropriate HTTP status code and a structured JSON error message. The client will then deserialize this response back into the original error class.
