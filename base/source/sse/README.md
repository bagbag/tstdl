# @tstdl/base/sse

A module providing both client-side and server-side utilities for working with Server-Sent Events (SSE). It offers a reactive client based on RxJS and a streamlined source class for server-side implementations.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Client-Side (`ServerSentEvents`)](#client-side-serversentevents)
  - [Server-Side (`ServerSentEventsSource`)](#server-side-serversenteventssource)
- [Usage](#usage)
  - [Server-Side Example](#server-side-example)
  - [Client-Side Example](#client-side-example)
- [API Summary](#api-summary)

## Features

- **Isomorphic:** Provides type-safe utilities for both client and server environments.
- **Reactive Client:** Offers an RxJS-based client for easy integration into modern frontends, abstracting `EventSource` complexities.
- **Efficient Server Source:** Includes a stream-based server-side source for efficient, non-blocking event pushing.
- **Automatic State Management:** The client automatically handles and exposes connection states (connecting, open, closed).
- **Full SSE Spec Support:** Supports named events, comments, custom event IDs, and client retry intervals.

## Core Concepts

The module is split into two main components, one for the client and one for the server.

### Client-Side (`ServerSentEvents`)

The `ServerSentEvents` class is a wrapper for the standard browser `EventSource` API. It is designed for use in browser environments and provides a robust, reactive interface using RxJS. Instead of manually managing event listeners, you can subscribe to `Observable` streams for connection state changes, errors, and incoming messages. This allows for a more declarative and manageable approach to handling real-time data streams.

### Server-Side (`ServerSentEventsSource`)

The `ServerSentEventsSource` class is a helper for creating SSE streams on the server (e.g., in a Node.js framework). It manages a `ReadableStream` that can be directly used in an HTTP response body. It provides simple methods like `sendJson()` and `sendText()` to push events to the connected client, automatically formatting them according to the SSE specification. This class simplifies the process of implementing SSE endpoints by handling the low-level stream and message formatting details.

## Usage

### Server-Side Example

This example shows how to create an API endpoint that streams product status updates. It sends an initial list of products and then pushes updates periodically.

```typescript
import { apiController, type ApiServerResult } from '@tstdl/base/api/server';
import { defineApi } from '@tstdl/base/api';
import { ServerSentEvents, ServerSentEventsSource } from '@tstdl/base/sse';
import { sleep } from '@tstdl/base/promise';
import { object, string } from '@tstdl/base/schema';

// Define a simple Product type
const Product = object({ id: string(), name: string(), status: string() });

// Mock product data service
const ProductService = {
  async getProducts() {
    return [
      { id: '1', name: 'Laptop', status: 'In Stock' },
      { id: '2', name: 'Mouse', status: 'In Stock' },
    ];
  },
  async getProductUpdate(id: string) {
    const statuses = ['In Stock', 'Low Stock', 'Out of Stock'];
    return { id, status: statuses[Math.floor(Math.random() * statuses.length)] };
  },
};

// Define the API endpoint
const productApi = defineApi({
  resource: 'products',
  endpoints: {
    getStatusStream: {
      resource: 'status-stream',
      method: 'GET',
      result: ServerSentEvents,
    },
  },
});

@apiController(productApi)
class ProductApiController {
  async getStatusStream(): ApiServerResult<typeof productApi, 'getStatusStream'> {
    const source = new ServerSentEventsSource();

    // Start sending events in a background task
    (async () => {
      try {
        // 1. Send initial data
        const initialProducts = await ProductService.getProducts();
        await source.sendJson({ name: 'initial-load', data: initialProducts });

        // 2. Send periodic updates
        while (!source.closed()) {
          await sleep(5000); // Wait 5 seconds

          if (source.closed()) break;

          const productToUpdate = initialProducts[Math.floor(Math.random() * initialProducts.length)];
          const update = await ProductService.getProductUpdate(productToUpdate.id);

          await source.sendJson({ name: 'product-update', data: update });
        }
      } catch (error) {
        console.error('Error in SSE stream:', error);
        await source.close();
      }
    })();

    // Return the source, which the API server will handle
    return source;
  }
}
```

### Client-Side Example

Here is how a client would consume the product status stream from the server example above.

```typescript
import { ServerSentEvents, ServerSentEventsState } from '@tstdl/base/sse';
import { takeUntil, Subject } from 'rxjs';

type Product = { id: string; name: string; status: string };

const destroy$ = new Subject<void>();
const sse = new ServerSentEvents('/api/products/status-stream');

// 1. Subscribe to connection state changes
sse.state$.pipe(takeUntil(destroy$)).subscribe((state) => {
  switch (state) {
    case ServerSentEventsState.Connecting:
      console.log('Connecting to product status stream...');
      break;
    case ServerSentEventsState.Open:
      console.log('Connection established.');
      break;
    case ServerSentEventsState.Closed:
      console.log('Connection closed.');
      break;
  }
});

// 2. Handle the initial data load
sse
  .message$('initial-load')
  .pipe(takeUntil(destroy$))
  .subscribe((event) => {
    const products: Product[] = JSON.parse(event.data);
    console.log('Initial products received:', products);
    // You would typically update your application's state here
  });

// 3. Handle subsequent product updates
sse
  .message$('product-update')
  .pipe(takeUntil(destroy$))
  .subscribe((event) => {
    const productUpdate: Partial<Product> & { id: string } = JSON.parse(event.data);
    console.log('Product update:', productUpdate);
    // Update the specific product in your application's state
  });

// 4. Handle connection errors
sse.error$.pipe(takeUntil(destroy$)).subscribe((error) => {
  console.error('SSE Error:', error);
});

// 5. Clean up when the component/page is destroyed
function cleanup() {
  sse.close();
  destroy$.next();
  destroy$.complete();
}
```

## API Summary

The API is divided into a client-side class (`ServerSentEvents`) and a server-side class (`ServerSentEventsSource`).

### `ServerSentEvents` (Client)

A reactive wrapper for the browser's `EventSource` API.

| Member          | Signature                                                    | Description                                                                      |
| :-------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **constructor** | `constructor(url: string, options?: EventSourceInit)`        | Creates a new SSE client instance.                                               |
| `state`         | `get state(): ServerSentEventsState`                         | Synchronously gets the current connection state.                                 |
| `state$`        | `Observable<ServerSentEventsState>`                          | Emits the connection state whenever it changes.                                  |
| `isConnecting$` | `Observable<boolean>`                                        | Emits `true` when the connection is being established.                           |
| `isOpen$`       | `Observable<boolean>`                                        | Emits `true` when the connection is open, `false` otherwise.                     |
| `isClosed$`     | `Observable<boolean>`                                        | Emits `true` when the connection is closed.                                      |
| `open$`         | `Observable<void>`                                           | Emits when the connection is successfully opened.                                |
| `close$`        | `Observable<void>`                                           | Emits when the connection is closed.                                             |
| `error$`        | `Observable<Event>`                                          | Emits when a connection error occurs.                                            |
| `message$`      | `message$(event?: string): Observable<MessageEvent<string>>` | Returns an observable for messages of a given event name. Defaults to `message`. |
| `close()`       | `close(): void`                                              | Manually closes the connection.                                                  |

### `ServerSentEventsSource` (Server)

A helper class to create and manage an SSE stream on the server.

| Member          | Signature                                             | Description                                                                                     |
| :-------------- | :---------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **constructor** | `constructor()`                                       | Creates a new source instance.                                                                  |
| `readable`      | `ReadableStream<string>`                              | The readable stream to be sent in the HTTP response body.                                       |
| `closed`        | `ReadonlySignal<boolean>`                             | A signal that is `true` if the stream has been closed. Call `closed()` to get value.            |
| `error`         | `ReadonlySignal<Error \| undefined>`                  | A signal that holds the error if the stream was closed due to one. Call `error()` to get value. |
| `close()`       | `close(): Promise<void>`                              | Closes the stream.                                                                              |
| `sendComment()` | `sendComment(comment: string): Promise<void>`         | Sends a comment to the client (ignored by `EventSource`).                                       |
| `sendText()`    | `sendText(event: ServerSentTextEvent): Promise<void>` | Sends a text-based event. `event.data` must be a string.                                        |
| `sendJson()`    | `sendJson(event: ServerSentJsonEvent): Promise<void>` | Sends a JSON-based event. `event.data` is automatically stringified.                            |

### Enums & Types

- **`ServerSentEventsState`**: Enum with values `Connecting`, `Open`, `Closed`.
- **`ServerSentEvent`**: A union type (`ServerSentTextEvent` | `ServerSentJsonEvent`) representing a potential event with the following optional properties:
  - `name?: string`: The event name.
  - `data?: string | any`: The event payload.
  - `id?: string`: A unique ID for the event.
  - `retry?: number`: A recommended reconnection time in milliseconds for the client.
