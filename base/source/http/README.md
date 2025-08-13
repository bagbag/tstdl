# @tstdl/base/http

A powerful, isomorphic, middleware-based HTTP client and server library for TypeScript.

This module provides a comprehensive suite of tools for handling HTTP communication. It features a flexible client with a middleware pipeline and a modern, async-iterable-based server, both designed for robustness and type safety.

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
  - [Client](#client)
  - [Server](#server)
  - [Configuration](#configuration)

## Features

- **Isomorphic Design:** Shared abstractions for client and server, with specific adapters for different environments (e.g., `undici` for Node.js).
- **Middleware-Driven Client:** Intercept and modify requests and responses using a flexible and powerful async middleware pipeline.
- **Pluggable Client Adapter:** The `HttpClientAdapter` allows swapping out the underlying HTTP engine.
- **Modern Server Abstraction:** The `HttpServer` uses an async iterator pattern for elegant and efficient request handling.
- **Typed API:** Strongly typed interfaces for requests, responses, headers, and query parameters to catch errors at compile time.
- **Flexible Body Handling:** Seamlessly works with JSON, text, forms (`x-www-form-urlencoded`), `FormData`, binary `Uint8Array`, and `ReadableStream`.
- **Convenience Helpers:** Utility classes like `HttpHeaders`, `HttpQuery`, and `HttpForm` simplify common tasks.

## Core Concepts

### HTTP Client

The client is designed around three main components: `HttpClient`, `HttpClientAdapter`, and `HttpClientMiddleware`.

-   **`HttpClient`**: The primary interface for making requests. It manages configuration, default headers, and the middleware pipeline. It offers convenience methods like `getJson()`, `post()`, etc.

-   **`HttpClientAdapter`**: The "engine" that performs the actual HTTP call. The library is decoupled from any specific implementation. For Node.js, the `UndiciHttpClientAdapter` is provided, which uses the high-performance `undici` library. You must configure an adapter for the client to function.

-   **`HttpClientMiddleware`**: A function that intercepts a request before it's sent and the response after it's received. Middleware is composed into a pipeline, allowing for cross-cutting concerns like logging, authentication, request modification, and custom error handling. Each middleware receives a `context` object (containing the request and eventually the response) and a `next` function to pass control to the next middleware in the chain.

### HTTP Server

The server implementation is based on the `HttpServer` abstract class.

-   **`HttpServer`**: An async iterable that yields a `HttpServerRequestContext` for each incoming connection. This design promotes a clean, modern loop for processing requests (`for await (const context of server)`).

-   **`HttpServerRequestContext`**: An object that encapsulates everything needed to handle a single request. It contains:
    -   `request`: An `HttpServerRequest` instance with details like URL, method, headers, and body.
    -   `respond`: A function to send an `HttpServerResponse` back to the client.
    -   `close`: A function to close the connection.
    -   `context`: The raw context from the underlying server implementation (e.g., Node.js `IncomingMessage` and `ServerResponse`).

-   **`NodeHttpServer`**: The default implementation of `HttpServer` for Node.js, built on top of the native `node:http` module.

## Usage

### Client Setup

First, configure the `HttpClient` with an adapter. In a Node.js environment, use the `UndiciHttpClientAdapter`.

```typescript
import { HttpClient, configureUndiciHttpClientAdapter } from '@tstdl/base/http';
import { Injector } from '#/injector/injector.js'; // Assuming a DI container setup

// Configure and register the Undici adapter
configureUndiciHttpClientAdapter({ register: true });

// Get an instance of the client
const httpClient = Injector.resolve(HttpClient);
```

### Making Requests

The `HttpClient` provides intuitive methods for all common HTTP verbs.

```typescript
// Simple GET request
const response = await httpClient.get('https://api.example.com/items');

// GET request with query parameters
const user = await httpClient.getJson('https://api.example.com/users', {
  query: { id: 123 }
});
console.log(user.name);

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
import type { HttpClientMiddleware, HttpClientMiddlewareNext, HttpClientMiddlewareContext } from '@tstdl/base/http';
import { configureHttpClient, configureUndiciHttpClientAdapter, HttpClient } from '@tstdl/base/http';
import { Injector } from '#/injector/injector.js';

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
    console.error('Body:', await error.responseInstance?.body.readAsText());
  } else {
    console.error('An unknown error occurred:', error);
  }
}
```

### Server Setup

Configure and run the `HttpServer`.

```typescript
import { configureNodeHttpServer, HttpServer, HttpServerResponse } from '@tstdl/base/http';
import { Injector } from '#/injector/injector.js';

// Register the Node.js server implementation
configureNodeHttpServer();

const httpServer = Injector.resolve(HttpServer);

// Start listening on port 3000
httpServer.listen(3000);
```

### Handling Incoming Requests

Loop through incoming requests using the async iterator pattern.

```typescript
import { HttpServer, HttpServerResponse, type HttpServerRequestContext } from '@tstdl/base/http';
import { Injector } from '#/injector/injector.js';

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

This is a brief overview of the main classes and functions.

### Client

-   **`HttpClient`**:
    -   `get(url, options?)`: `Promise<HttpClientResponse>`
    -   `getJson<T>(url, options?)`: `Promise<T>`
    -   `getText(url, options?)`: `Promise<string>`
    -   `post(url, options?)`: `Promise<HttpClientResponse>`
    -   `put(url, options?)`: `Promise<HttpClientResponse>`
    -   `patch(url, options?)`: `Promise<HttpClientResponse>`
    -   `delete(url, options?)`: `Promise<HttpClientResponse>`
    -   `request(method, url, options?)`: `Promise<HttpClientResponse>`
    -   `rawRequest(request)`: `Promise<HttpClientResponse>`
    -   `addMiddleware(middleware)`: `void`

-   **`HttpClientRequest`**:
    -   `url: string`
    -   `method: HttpMethod`
    -   `headers: HttpHeaders`
    -   `query: HttpQuery`
    -   `body?: HttpRequestBody`
    -   `timeout: number`

-   **`HttpClientResponse`**:
    -   `request: HttpClientRequest`
    -   `statusCode: number`
    -   `headers: HttpHeaders`
    -   `body: HttpBody`

-   **`HttpBody`**:
    -   `readAsBuffer()`: `Promise<Uint8Array>`
    -   `readAsText()`: `Promise<string>`
    -   `readAsJson<T>()`: `Promise<T>`
    -   `readAsStream()`: `ReadableStream<string | Uint8Array>`

### Server

-   **`HttpServer`**:
    -   `listen(port)`: `Promise<void>`
    -   `close(timeout)`: `Promise<void>`
    -   `[Symbol.asyncIterator]()`: `AsyncIterator<HttpServerRequestContext>`

-   **`HttpServerRequest`**:
    -   `url: URL`
    -   `method: HttpMethod`
    -   `headers: HttpHeaders`
    -   `query: HttpQuery`
    -   `cookies: CookieParser`
    -   `body: HttpBody`
    -   `ip: string`

-   **`HttpServerResponse`**:
    -   `constructor(options?)`
    -   `statusCode?: number`
    -   `headers: HttpHeaders`
    -   `body?: { json?, text?, buffer?, stream? }`
    -   `static redirect(url, options?)`: `HttpServerResponse`

### Configuration

-   **`configureHttpClient(config)`**: Configures the global `HttpClient`.
    -   `config.adapter`: `Type<HttpClientAdapter>`
    -   `config.middleware`: `OneOrMany<HttpClientMiddleware>`
    -   `config.baseUrl`: `string`
-   **`configureNodeHttpServer(config?)`**: Registers the `NodeHttpServer` as the default `HttpServer`.
-   **`configureUndiciHttpClientAdapter(config?)`**: Configures and optionally registers the `UndiciHttpClientAdapter`.