# @tstdl/base/http

A powerful, isomorphic, middleware-based HTTP client and server library for TypeScript. This module provides a comprehensive suite of tools for handling HTTP communication, featuring a flexible client with a middleware pipeline and a modern, async-iterable-based server.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [HTTP Client](#http-client)
  - [HTTP Server](#http-server)
- [Usage](#usage)
  - [Client Setup](#client-setup)
  - [Making Requests](#making-requests)
  - [Handling Responses](#handling-responses)
  - [Using Middleware](#using-middleware)
  - [Error Handling](#error-handling)
  - [Server Setup](#server-setup)
  - [Handling Incoming Requests](#handling-incoming-requests)
- [API Summary](#api-summary)

## Features

- **Isomorphic Design:** Shared abstractions for client and server, with specific adapters for different environments (e.g., `undici` for Node.js).
- **Middleware-Driven Client:** Intercept and modify requests/responses using a flexible async middleware pipeline for concerns like logging, authentication, and caching.
- **Pluggable Client Adapter:** The `HttpClientAdapter` allows swapping the underlying HTTP engine. `UndiciHttpClientAdapter` is provided for high-performance Node.js applications.
- **Modern Server Abstraction:** The `HttpServer` uses an async iterator pattern (`for await...of`) for elegant and efficient request handling.
- **Advanced Body Handling:** Seamlessly works with JSON, text, forms (`x-www-form-urlencoded`), `FormData`, binary (`Uint8Array`, `Blob`), and `ReadableStream`.
- **Automatic Parameter Mapping:** Intelligently maps request parameters to URL path segments, query strings, or the request body.
- **Typed API:** Strongly typed interfaces for requests, responses, headers, and query parameters to catch errors at compile time.
- **Utility Classes:** Helpers like `HttpHeaders`, `HttpQuery`, and `HttpForm` simplify common tasks.

## Core Concepts

### HTTP Client

The client is designed around three main components: `HttpClient`, `HttpClientAdapter`, and `HttpClientMiddleware`.

- **`HttpClient`**: The primary interface for making requests. It manages configuration, default headers, and the middleware pipeline. It offers convenience methods like `getJson()`, `post()`, etc.

- **`HttpClientAdapter`**: The "engine" that performs the actual HTTP call. The library is decoupled from any specific implementation. For Node.js, the `UndiciHttpClientAdapter` is provided, which uses the high-performance `undici` library. You must configure an adapter for the client to function.

- **`HttpClientMiddleware`**: A function that intercepts a request before it's sent and the response after it's received. Middleware is composed into a pipeline, allowing for cross-cutting concerns like logging, authentication, request modification, and custom error handling. Each middleware receives a `context` object (containing the request and eventually the response) and a `next` function to pass control to the next middleware in the chain.

### HTTP Server

The server implementation is based on the `HttpServer` abstract class.

- **`HttpServer`**: An async iterable that yields a `HttpServerRequestContext` for each incoming connection. This design promotes a clean, modern loop for processing requests (`for await (const context of server)`).

- **`HttpServerRequestContext`**: An object that encapsulates everything needed to handle a single request. It contains:
  - `request`: An `HttpServerRequest` instance with details like URL, method, headers, and body.
  - `respond`: A function to send an `HttpServerResponse` back to the client.
  - `close`: A function to close the connection.
  - `context`: The raw context from the underlying server implementation (e.g., Node.js `IncomingMessage` and `ServerResponse`).

- **`NodeHttpServer`**: The default implementation of `HttpServer` for Node.js, built on top of the native `node:http` module. It supports features like trusted proxy IP resolution.

## Usage

### Client Setup

First, configure the `HttpClient` with an adapter. In a Node.js environment, use the `UndiciHttpClientAdapter`.

```typescript
import { HttpClient, configureUndiciHttpClientAdapter } from '@tstdl/base/http';
import { Injector } from '@tstdl/base/injector';

// Configure and register the Undici adapter
configureUndiciHttpClientAdapter({ register: true });

// Get an instance of the client
const httpClient = Injector.resolve(HttpClient);
```

### Making Requests

The `HttpClient` provides intuitive methods for all common HTTP verbs. It also supports automatic parameter mapping.

```typescript
// Simple GET request
const response = await httpClient.get('https://api.example.com/items');

// GET request with query parameters
const user = await httpClient.getJson('https://api.example.com/users', {
  query: { id: 123 }
});
console.log(user.name);

// Automatic parameter mapping
// Maps `userId` to the URL path and `active` to the query string.
const user = await httpClient.getJson('https://api.example.com/users/:userId', {
  parameters: {
    userId: 123,
    active: true
  }
});
// Resulting URL: https://api.example.com/users/123?active=true

// POST request with a JSON body
const newItem = await httpClient.postJson('https://api.example.com/items', {
  body: {
    json: { name: 'New Item', value: 42 }
  }
});
```

### Handling Responses

The `HttpClientResponse` object contains the status, headers, and a `body` property of type `HttpBody` for easy content access.

```typescript
const response = await httpClient.get('https://api.example.com/items/1');

console.log(response.statusCode); // 200
console.log(response.headers.contentType); // 'application/json'

// Read the body as a specific type. The body can only be read once.
if (response.statusCode == 200) {
  const item = await response.body.readAsJson();
  console.log(item);
}
```

### Using Middleware

Middleware can be used to add common functionality like authentication or logging.

```typescript
import {
  HttpClient,
  configureHttpClient,
  configureUndiciHttpClientAdapter,
  type HttpClientMiddleware,
  type HttpClientMiddlewareContext,
  type HttpClientMiddlewareNext
} from '@tstdl/base/http';
import { Injector } from '@tstdl/base/injector';

// A simple logging middleware
const loggingMiddleware: HttpClientMiddleware = async (context: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext) => {
  console.log(`Sending ${context.request.method} request to ${context.request.url}`);
  await next(); // Pass control to the next middleware
  console.log(`Received response with status ${context.response!.statusCode}`);
};

// An authentication middleware
const authMiddleware: HttpClientMiddleware = async (context: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext) => {
  context.request.headers.set('Authorization', 'Bearer my-secret-token');
  await next();
};

configureUndiciHttpClientAdapter();
configureHttpClient({
  middleware: [loggingMiddleware, authMiddleware]
});

const httpClient = Injector.resolve(HttpClient);
await httpClient.get('https://api.example.com/secure-data');
```

### Error Handling

By default, the client throws an `HttpError` for responses with non-2xx status codes.

```typescript
import { HttpError } from '@tstdl/base/http';

try {
  await httpClient.get('https://api.example.com/not-found');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`HTTP Error: ${error.reason}`);
    console.error(`Status: ${error.response?.statusCode}`);

    // The raw response instance is available on the error for inspection
    const bodyText = await error.responseInstance?.body.readAsText();
    console.error('Body:', bodyText);
  } else {
    console.error('An unknown error occurred:', error);
  }
}
```

### Server Setup

Configure and run the `HttpServer`.

```typescript
import { configureNodeHttpServer, HttpServer } from '@tstdl/base/http';
import { Injector } from '@tstdl/base/injector';

// Register the Node.js server implementation
configureNodeHttpServer();

const httpServer = Injector.resolve(HttpServer);

// Start listening on port 3000
httpServer.listen(3000);
```

### Handling Incoming Requests

Loop through incoming requests using the async iterator pattern.

```typescript
import {
  HttpServer,
  HttpServerResponse,
  type HttpServerRequestContext
} from '@tstdl/base/http';
import { Injector } from '@tstdl/base/injector';

const httpServer = Injector.resolve(HttpServer);

async function main(): Promise<void> {
  console.log('Server starting...');
  await httpServer.listen(3000);

  for await (const context of httpServer) {
    handleRequest(context).catch((error) => {
      console.error('Failed to handle request', error);
      context.close();
    });
  }
}

async function handleRequest(context: HttpServerRequestContext): Promise<void> {
  const { request, respond } = context;
  const url = request.url;

  if (url.pathname == '/hello' && request.method == 'GET') {
    const name = request.query.tryGetSingle('name') ?? 'World';
    const response = new HttpServerResponse({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        json: { message: `Hello, ${name}!` }
      }
    });
    await respond(response);
  } else {
    const response = new HttpServerResponse({ statusCode: 404 });
    await respond(response);
  }
}

main();
```

## API Summary

### Configuration

| Function | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`configureHttpClient`** | `config: HttpClientModuleConfig` | `void` | Configures the global `HttpClient`, its adapter, and middleware. |
| **`configureUndiciHttpClientAdapter`** | `options?: UndiciHttpClientAdapterOptions & { register?: boolean }` | `void` | Configures and optionally registers the `UndiciHttpClientAdapter`. |
| **`configureNodeHttpServer`** | `configuration?: Partial<NodeHttpServerConfiguration>` | `void` | Registers the `NodeHttpServer` as the default `HttpServer`. |

### Client

| Class / Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`HttpClient.get`** | `url: string`, `options?: HttpClientRequestOptions` | `Promise<HttpClientResponse>` | Performs a GET request. |
| **`HttpClient.getJson`** | `url: string`, `options?: HttpClientRequestOptions` | `Promise<T>` | Performs a GET request and parses the response body as JSON. |
| **`HttpClient.post`** | `url: string`, `options?: HttpClientRequestOptions` | `Promise<HttpClientResponse>` | Performs a POST request. |
| **`HttpClient.put`** | `url: string`, `options?: HttpClientRequestOptions` | `Promise<HttpClientResponse>` | Performs a PUT request. |
| **`HttpClient.patch`** | `url: string`, `options?: HttpClientRequestOptions` | `Promise<HttpClientResponse>` | Performs a PATCH request. |
| **`HttpClient.delete`** | `url: string`, `options?: HttpClientRequestOptions` | `Promise<HttpClientResponse>` | Performs a DELETE request. |
| **`HttpClientRequest.url`** | | `string` | The full request URL. |
| **`HttpClientRequest.method`** | | `HttpMethod` | The HTTP method. |
| **`HttpClientRequest.headers`** | | `HttpHeaders` | Request headers map. |
| **`HttpClientRequest.body`** | | `HttpRequestBody \| undefined` | The request body. |
| **`HttpClientResponse.statusCode`** | | `number` | The HTTP status code. |
| **`HttpClientResponse.headers`** | | `HttpHeaders` | Response headers map. |
| **`HttpClientResponse.body`** | | `HttpBody` | The response body handler. |
| **`HttpBody.readAsBuffer`** | `options?: ReadBodyOptions` | `Promise<Uint8Array>` | Reads the body as a buffer. |
| **`HttpBody.readAsText`** | `options?: ReadBodyOptions` | `Promise<string>` | Reads the body as a string. |
| **`HttpBody.readAsJson`** | `options?: ReadBodyAsJsonOptions` | `Promise<T>` | Reads and parses the body as JSON. |
| **`HttpBody.readAsBinaryStream`** | `options?: ReadBodyOptions` | `ReadableStream<Uint8Array>` | Reads the body as a binary stream. |

### Server

| Class / Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`HttpServer.listen`** | `port: number` | `Promise<void>` | Starts listening on the given port. |
| **`HttpServer.close`** | `timeout: number` | `Promise<void>` | Stops the server gracefully. |
| **`HttpServer.[Symbol.asyncIterator]`** | | `AsyncIterator<HttpServerRequestContext>` | Iterates over incoming requests. |
| **`HttpServerRequest.url`** | | `URL` | The parsed URL of the request. |
| **`HttpServerRequest.method`** | | `HttpMethod` | The HTTP method. |
| **`HttpServerRequest.headers`** | | `HttpHeaders` | Incoming request headers. |
| **`HttpServerRequest.body`** | | `HttpBody` | The request body handler. |
| **`HttpServerRequest.ip`** | | `string` | The client's IP address. |
| **`HttpServerResponse.constructor`** | `options?: HttpServerResponseOptions` | `HttpServerResponse` | Creates a new response object. |
| **`HttpServerResponse.redirect`** | `url: string`, `options?: HttpServerResponseOptions` | `HttpServerResponse` | Creates a redirect response (303). |