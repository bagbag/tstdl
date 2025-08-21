# @tstdl/base/http

A powerful, isomorphic, middleware-based HTTP client and server library for TypeScript. This module provides a comprehensive suite of tools for handling HTTP communication, featuring a flexible client with a middleware pipeline and a modern, async-iterable-based server.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [HTTP Client](#http-client)
  - [HTTP Server](#http-server)
- [Usage](#usage)
  - [Client](#client)
    - [Client Setup](#client-setup)
    - [Making Requests](#making-requests)
    - [Handling Responses](#handling-responses)
    - [Using Middleware](#using-middleware)
    - [Bypassing Caches](#bypassing-caches)
    - [Error Handling](#error-handling)
  - [Server](#server)
    - [Server Setup](#server-setup)
    - [Handling Incoming Requests](#handling-incoming-requests)
- [API Summary](#api-summary)
  - [Configuration](#configuration)
  - [Client Classes](#client-classes)
  - [Server Classes](#server-classes)

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

- **`HttpClient`**: The primary interface for making requests. It manages configuration, default headers, and the middleware pipeline. It offers convenience methods like `getJson()`, `post()`, etc. The flow of a request is: `HttpClient` -> `Middleware Chain` -> `HttpClientAdapter`.

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

### Client

#### Client Setup

First, configure the `HttpClient` with an adapter. In a Node.js environment, use the `UndiciHttpClientAdapter`.

```typescript
import { HttpClient, configureHttpClient, configureUndiciHttpClientAdapter } from '@tstdl/base/http';
import { Injector } from '@tstdl/base/injector';

// Configure and register the Undici adapter
configureUndiciHttpClientAdapter({ register: true });

// Configure the HttpClient with a base URL
configureHttpClient({
  baseUrl: 'https://api.example.com'
});

// Get an instance of the client from the DI container
const httpClient = Injector.resolve(HttpClient);
```

#### Making Requests

The `HttpClient` provides intuitive methods for all common HTTP verbs. It also supports automatic parameter mapping.

**Simple GET Request**
```typescript
const response = await httpClient.get('/users');
const users = await response.body.readAsJson();
```

**GET with Query Parameters**
You can provide query parameters via the `query` object or use automatic mapping with the `parameters` object.
```typescript
// Using the `query` object
const user = await httpClient.getJson('/users', {
  query: { id: 123 }
});

// Using automatic parameter mapping
const products = await httpClient.getJson('/products', {
  parameters: { category: 'electronics', inStock: true }
});
// Resulting URL: /products?category=electronics&inStock=true
```

**URL Path Parameters**
```typescript
// Maps `userId` to the URL path segment.
const user = await httpClient.getJson('/users/:userId', {
  parameters: { userId: 'abc-123' }
});
// Resulting URL: /users/abc-123
```

**POST with JSON Body**
```typescript
const newProduct = { name: 'Super Widget', price: 99.99 };
const createdProduct = await httpClient.postJson('/products', {
  body: { json: newProduct }
});
```

**POST with Form Data**
```typescript
// for application/x-www-form-urlencoded
const response = await httpClient.post('/login', {
  body: {
    form: {
      username: 'test',
      password: 'password123'
    }
  }
});

// for multipart/form-data
const formData = new FormData();
formData.append('username', 'testuser');
formData.append('avatar', new Blob(['...file content...']), 'avatar.jpg');

await httpClient.post('/users/profile-picture', {
  body: { formData }
});
```

#### Handling Responses

The `HttpClientResponse` object contains the status, headers, and a `body` property of type `HttpBody` for easy content access. The body can only be read once.

```typescript
const response = await httpClient.get('/products/1');

console.log(response.statusCode); // 200
console.log(response.headers.contentType); // 'application/json'

// Read the body based on its type
if (response.statusCode == 200) {
  const item = await response.body.readAsJson(); // or .readAsText(), .readAsBuffer(), ...
  console.log(item);
}

// Streaming a response body
const stream = response.body.readAsBinaryStream();
for await (const chunk of stream) {
  console.log(`Received ${chunk.length} bytes`);
}
```

#### Using Middleware

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

// An authentication middleware
const authMiddleware: HttpClientMiddleware = async (context: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext) => {
  context.request.headers.set('Authorization', 'Bearer my-secret-token');
  await next();
};

configureUndiciHttpClientAdapter();
configureHttpClient({
  middleware: [authMiddleware]
});

const httpClient = Injector.resolve(HttpClient);
await httpClient.get('/secure-data');
```

#### Bypassing Caches

Some adapters or middleware may implement caching. To bypass this for a specific request, you can use the `bustCache` token in the request context.

```typescript
import { bustCache, HttpClient } from '@tstdl/base/http';
import { Injector } from '@tstdl/base/injector';

const httpClient = Injector.resolve(HttpClient);

// This request will signal to bypass any caching layers
const freshData = await httpClient.getJson('/real-time-data', {
  context: { [bustCache]: true }
});
```

#### Error Handling

By default, the client throws an `HttpError` for responses with non-2xx status codes.

```typescript
import { HttpError } from '@tstdl/base/http';

try {
  await httpClient.get('/not-found');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`HTTP Error: ${error.reason}`); // e.g., 'Not Found'
    console.error(`Status: ${error.response?.statusCode}`); // 404

    // The raw response instance is available on the error for inspection
    const bodyText = await error.responseInstance?.body.readAsText();
    console.error('Body:', bodyText);
  } else {
    console.error('An unknown error occurred:', error);
  }
}
```

### Server

#### Server Setup

Configure and run the `HttpServer`.

```typescript
import { configureNodeHttpServer, HttpServer } from '@tstdl/base/http/server';
import { Injector } from '@tstdl/base/injector';

// Register the Node.js server implementation
configureNodeHttpServer();

const httpServer = Injector.resolve(HttpServer);

// Start listening on port 3000
httpServer.listen(3000);
```

#### Handling Incoming Requests

Loop through incoming requests using the async iterator pattern.

```typescript
import {
  HttpServer,
  HttpServerResponse,
  type HttpServerRequestContext
} from '@tstdl/base/http/server';
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
  const { url, method } = request;

  if (url.pathname == '/users' && method == 'GET') {
    const users = [{ id: 1, name: 'John Doe' }];
    await respond(new HttpServerResponse({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { json: users }
    }));
  } else if (url.pathname == '/users' && method == 'POST') {
    const newUser = await request.body.readAsJson();
    console.log('New user:', newUser);
    await respond(new HttpServerResponse({ statusCode: 201 }));
  } else if (url.pathname == '/redirect') {
    await respond(HttpServerResponse.redirect('/users'));
  } else {
    await respond(new HttpServerResponse({
      statusCode: 404,
      body: { text: 'Not Found' }
    }));
  }
}

main();
```

## API Summary

### Configuration

| Function | Signature | Description |
| :--- | :--- | :--- |
| **`configureHttpClient`** | `(config: HttpClientModuleConfig) => void` | Configures the global `HttpClient`, its adapter, and middleware. |
| **`configureUndiciHttpClientAdapter`** | `(options?: UndiciHttpClientAdapterOptions & { register?: boolean }) => void` | Configures and optionally registers the `UndiciHttpClientAdapter`. |
| **`configureNodeHttpServer`** | `(configuration?: Partial<NodeHttpServerConfiguration>) => void` | Registers the `NodeHttpServer` as the default `HttpServer`. |

### Client Classes

| Class / Method / Property | Signature / Type | Description |
| :--- | :--- | :--- |
| `HttpClient` | `class` | The main entry point for making HTTP requests. |
| **`getJson<T>`** | `(url: string, options?: HttpClientRequestOptions) => Promise<T>` | Performs a GET request and parses the response body as JSON. |
| **`postJson<T>`** | `(url: string, options?: HttpClientRequestOptions) => Promise<T>` | Performs a POST request and parses the response body as JSON. |
| **`request`** | `(method: HttpMethod, url: string, options?: HttpClientRequestOptions) => Promise<HttpClientResponse>` | Performs a request with the specified method. |
| `HttpClientRequest` | `class` | Represents an outgoing HTTP request. |
| **`url`** | `string` | The full request URL. |
| **`method`** | `HttpMethod` | The HTTP method (e.g., 'GET', 'POST'). |
| **`headers`** | `HttpHeaders` | A map-like object for request headers. |
| **`body`** | `HttpRequestBody \| undefined` | The request body, supporting various types. |
| **`abort()`** | `() => void` | Aborts the request. |
| `HttpClientResponse` | `class` | Represents an incoming HTTP response. |
| **`statusCode`** | `number` | The HTTP status code. |
| **`headers`** | `HttpHeaders` | A map-like object for response headers. |
| **`body`** | `HttpBody` | The response body handler. |
| **`close()`** | `() => void` | Closes the response and releases resources. |
| `HttpBody` | `class` | Provides methods to read the response body in various formats. |
| **`readAsBuffer()`** | `() => Promise<Uint8Array>` | Reads the body as a buffer. |
| **`readAsText()`** | `() => Promise<string>` | Reads the body as a string. |
| **`readAsJson<T>()`** | `() => Promise<T>` | Reads and parses the body as JSON. |
| **`readAsBinaryStream()`** | `() => ReadableStream<Uint8Array>` | Reads the body as a binary stream. |

### Server Classes

| Class / Method / Property | Signature / Type | Description |
| :--- | :--- | :--- |
| `HttpServer` | `abstract class` | An async iterable server for handling HTTP requests. |
| **`listen`** | `(port: number) => Promise<void>` | Starts listening on the given port. |
| **`close`** | `(timeout: number) => Promise<void>` | Stops the server gracefully within a timeout. |
| `HttpServerRequest` | `class` | Represents an incoming HTTP request on the server. |
| **`url`** | `URL` | The parsed URL of the request. |
| **`method`** | `HttpMethod` | The HTTP method. |
| **`headers`** | `HttpHeaders` | Incoming request headers. |
| **`body`** | `HttpBody` | The request body handler. |
| **`ip`** | `string` | The client's IP address. |
| `HttpServerResponse` | `class` | Represents an outgoing HTTP response from the server. |
| **`constructor`** | `(options?: HttpServerResponseOptions) => HttpServerResponse` | Creates a new response object. |
| **`redirect`** | `(url: string, options?: HttpServerResponseOptions) => HttpServerResponse` | Creates a redirect response (303). |
