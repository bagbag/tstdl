# @tstdl/base/sse

A module for Server-Sent Events (SSE), providing both a low-level reactive client for discrete events and a high-level, delta-capable data streaming abstraction for synchronizing complex objects.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [High-Level: Data Streaming (`DataStream`)](#high-level-data-streaming-datastream)
  - [Low-Level: Event Pushing (`ServerSentEvents`)](#low-level-event-pushing-serversentevents)
- [Usage](#usage)
  - [High-Level Data Streaming (`DataStream`)](#high-level-data-streaming-datastream-1)
    - [Server-Side: `DataStreamSource`](#server-side-datastreamsource)
    - [Client-Side: `DataStream`](#client-side-datastream)
  - [Low-Level Event Pushing (`ServerSentEvents`)](#low-level-event-pushing-serversentevents-1)
    - [Server-Side: `ServerSentEventsSource`](#server-side-serversenteventssource)
    - [Client-Side: `ServerSentEvents`](#client-side-serversentevents)
- [API Summary](#api-summary)
  - [`DataStreamSource<T>`](#datastreamsourcet)
  - [`DataStream<T>`](#datastreamt)
  - [`ServerSentEventsSource`](#serversenteventssource)
  - [`ServerSentEvents`](#serversentevents)

## Features

- **Isomorphic:** Provides type-safe utilities for both client and server environments.
- **High-Level Data Streaming:** Synchronize complex JavaScript objects from server to client with minimal boilerplate.
- **Automatic Delta Updates:** `DataStreamSource` can automatically calculate and send only JSON diffs, saving bandwidth.
- **Seamless State Reconstruction:** The `DataStream` client automatically applies deltas, providing the full, updated object on every emission.
- **Reactive Client:** An RxJS-based client (`ServerSentEvents`) for handling connection states and low-level events.
- **Efficient Server Source:** A stream-based server-side source (`ServerSentEventsSource`) for efficient, non-blocking event pushing.
- **Full SSE Spec Support:** Supports named events, comments, custom event IDs, and client retry intervals.

## Core Concepts

This module provides two layers of abstraction for working with Server-Sent Events.

### High-Level: Data Streaming (`DataStream`)

The `DataStreamSource` (server) and `DataStream` (client) classes are designed for the primary use case of keeping a large, complex data object synchronized between the server and the client.

- **`DataStreamSource` (Server):** You send the entire data object to the source whenever it changes. The source intelligently calculates the difference (a "delta" or "diff") from the previously sent object and sends only this small delta to the client. The initial connection always receives the full object. This is highly efficient for large, frequently-updated data structures.

- **`DataStream` (Client):** This utility consumes the SSE stream. It listens for the initial full data object and subsequent delta messages. It automatically applies each delta to its local copy of the data, emitting the new, fully reconstructed object through an RxJS Observable. Your application code receives the complete, up-to-date object without needing to manage patching logic.

### Low-Level: Event Pushing (`ServerSentEvents`)

The `ServerSentEventsSource` (server) and `ServerSentEvents` (client) classes provide a foundational layer for sending and receiving discrete, named events. This is ideal when you are not synchronizing a single state object but rather pushing independent notifications or commands.

- **`ServerSentEventsSource` (Server):** A helper for creating SSE streams. It provides methods like `sendJson()` and `sendText()` to push individual named events, which are formatted according to the SSE specification.

- **`ServerSentEvents` (Client):** A wrapper around the browser's `EventSource` API that provides a reactive interface using RxJS. You can subscribe to observables for connection state changes, errors, and incoming messages by event name.

## Usage

### High-Level Data Streaming (`DataStream`)

This is the recommended approach for synchronizing state.

#### Server-Side: `DataStreamSource`

This example streams a user's profile, sending updates whenever it changes. The `DataStreamSource` automatically handles sending the full object initially and deltas for subsequent updates.

```typescript
import { apiController, type ApiServerResult } from '@tstdl/base/api/server';
import { defineApi } from '@tstdl/base/api';
import { DataStream, DataStreamSource } from '@tstdl/base/sse';
import { CancellationSignal } from '@tstdl/base/cancellation';
import { inject } from '@tstdl/base/injector';
import { sleep } from '@tstdl/base/promise';
import { object, string, array } from '@tstdl/base/schema';

// Define a User type
const User = object({
  id: string(),
  name: string(),
  email: string(),
  roles: array(string())
});
type User = typeof User.T;

// Mock user service that yields data changes
async function* watchUser(userId: string, signal: CancellationSignal): AsyncIterable<User> {
  let roles = ['viewer'];
  yield { id: userId, name: 'Jane Doe', email: 'jane.doe@example.com', roles };

  await sleep(3000, signal);
  if (signal.isSet) return;

  roles = ['viewer', 'editor']; // A role is added
  yield { id: userId, name: 'Jane Doe', email: 'jane.doe@example.com', roles };

  await sleep(3000, signal);
  if (signal.isSet) return;

  // Name is changed
  yield { id: userId, name: 'Jane A. Doe', email: 'jane.doe@example.com', roles };
}

// Define the API endpoint
const userApi = defineApi({
  resource: 'users',
  endpoints: {
    getProfileStream: {
      resource: ':id/profile-stream',
      method: 'GET',
      parameters: object({ id: string() }),
      result: DataStream<User>,
    },
  },
});

@apiController(userApi)
class UserApiController {
  #cancellationSignal = inject(CancellationSignal);

  getProfileStream({ parameters }: any): ApiServerResult<typeof userApi, 'getProfileStream'> {
    const userWatcher = watchUser(parameters.id, this.#cancellationSignal);
    return DataStreamSource.fromIterable(userWatcher, { delta: true });
  }
}
```

#### Client-Side: `DataStream`

The client connects and receives a seamless stream of the complete `User` object every time a change occurs on the server.

```typescript
import { DataStream, ServerSentEvents } from '@tstdl/base/sse';
import { Observable } from 'rxjs';

type User = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

const userId = '123';
const sse = new ServerSentEvents(`/api/users/${userId}/profile-stream`);

const user$: Observable<User> = DataStream.parse<User>(sse);

user$.subscribe(userProfile => {
  console.log('Received updated user profile:', userProfile);
  // Update your UI with the full, new user object
});

// Console output:
// Received updated user profile: { id: '123', name: 'Jane Doe', email: 'jane.doe@example.com', roles: ['viewer'] }
// (after 3s)
// Received updated user profile: { id: '123', name: 'Jane Doe', email: 'jane.doe@example.com', roles: ['viewer', 'editor'] }
// (after 3s)
// Received updated user profile: { id: '123', name: 'Jane A. Doe', email: 'jane.doe@example.com', roles: ['viewer', 'editor'] }
```

### Low-Level Event Pushing (`ServerSentEvents`)

Use this for sending discrete, stateless events.

#### Server-Side: `ServerSentEventsSource`

This endpoint sends distinct events for order status changes.

```typescript
import { ServerSentEvents, ServerSentEventsSource } from '@tstdl/base/sse';
import { sleep } from '@tstdl/base/promise';
// ... other imports

// ... in your API controller
async function getOrderStatusStream({ parameters }: any): Promise<ServerSentEventsSource> {
  const source = new ServerSentEventsSource();

  (async () => {
    await sleep(2000);
    if (source.closed()) return;
    await source.sendJson({ name: 'order-processed', data: { orderId: parameters.id, status: 'processed' } });

    await sleep(3000);
    if (source.closed()) return;
    await source.sendJson({ name: 'order-shipped', data: { orderId: parameters.id, trackingNumber: 'ABC-123' } });

    await sleep(5000);
    if (source.closed()) return;
    await source.sendJson({ name: 'order-delivered', data: { orderId: parameters.id, signedBy: 'John Doe' } });

    await source.close();
  })();

  return source;
}
```

#### Client-Side: `ServerSentEvents`

The client subscribes to each named event individually.

```typescript
import { ServerSentEvents } from '@tstdl/base/sse';
import { takeUntil, Subject } from 'rxjs';

const destroy$ = new Subject<void>();
const sse = new ServerSentEvents('/api/orders/123/status-stream');

sse.message$('order-processed').pipe(takeUntil(destroy$)).subscribe(event => {
  const data = JSON.parse(event.data);
  console.log(`Order ${data.orderId} is processed.`);
});

sse.message$('order-shipped').pipe(takeUntil(destroy$)).subscribe(event => {
  const data = JSON.parse(event.data);
  console.log(`Order ${data.orderId} shipped with tracking: ${data.trackingNumber}`);
});

sse.message$('order-delivered').pipe(takeUntil(destroy$)).subscribe(event => {
  const data = JSON.parse(event.data);
  console.log(`Order ${data.orderId} delivered.`);
});
```

## API Summary

### `DataStreamSource<T>`

A server-side helper to stream a data object `T`, with optional delta updates.

| Member          | Signature                                                                                        | Description                                                                    |
| :-------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **constructor** | `constructor(options?: { delta?: boolean })`                                                     | Creates a new source. `options.delta` defaults to `true`.                      |
| `fromIterable`  | `static fromIterable<T>(iterable: AnyIterable<T>, options?: { delta?: boolean }): DataStreamSource<T>` | Creates a source and automatically sends items from an async iterable.         |
| `send()`        | `send(data: T): Promise<void>`                                                                   | Sends a data object. Calculates and sends a delta if applicable.               |
| `close()`       | `close(): Promise<void>`                                                                         | Closes the underlying event stream.                                            |
| `error()`       | `error(error: unknown): Promise<void>`                                                           | Sends an error message to the client and closes the stream.                    |
| `closed`        | `ReadonlySignal<boolean>`                                                                        | A signal that is `true` if the stream is closed.                               |
| `eventSource`   | `ServerSentEventsSource`                                                                         | The underlying low-level source.                                               |

### `DataStream<T>`

A client-side utility to parse a `DataStream` from a `ServerSentEvents` connection.

| Member  | Signature                                                      | Description                                                                                                   |
| :------ | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `parse` | `static parse<T>(eventSource: ServerSentEvents): Observable<T>` | Parses messages and returns an Observable that emits the full, reconstructed data object on each update. |

### `ServerSentEventsSource`

A low-level server-side class to create and manage an SSE stream.

| Member          | Signature                                             | Description                                                                                     |
| :-------------- | :---------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **constructor** | `constructor()`                                       | Creates a new source instance.                                                                  |
| `readable`      | `ReadableStream<string>`                              | The readable stream to be sent in the HTTP response body.                                       |
| `closed`        | `ReadonlySignal<boolean>`                             | A signal that is `true` if the stream has been closed.                                          |
| `error`         | `ReadonlySignal<Error \| undefined>`                  | A signal holding an error if the stream closed due to one.                                      |
| `close()`       | `close(): Promise<void>`                              | Closes the stream.                                                                              |
| `sendComment()` | `sendComment(comment: string): Promise<void>`         | Sends a comment to the client (ignored by `EventSource`).                                       |
| `sendText()`    | `sendText(event: ServerSentTextEvent): Promise<void>` | Sends a text-based event.                                                                       |
| `sendJson()`    | `sendJson(event: ServerSentJsonEvent): Promise<void>` | Sends a JSON-based event. `event.data` is automatically stringified.                            |

### `ServerSentEvents`

A reactive client-side wrapper for the browser's `EventSource` API.

| Member          | Signature                                                    | Description                                                                      |
| :-------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **constructor** | `constructor(url: string, options?: EventSourceInit)`        | Creates a new SSE client instance.                                               |
| `state$`        | `Observable<ServerSentEventsState>`                          | Emits the connection state (`Connecting`, `Open`, `Closed`) whenever it changes. |
| `isOpen$`       | `Observable<boolean>`                                        | Emits `true` when the connection is open, `false` otherwise.                     |
| `error$`        | `Observable<Event>`                                          | Emits when a connection error occurs.                                            |
| `message$`      | `message$(event?: string): Observable<MessageEvent<string>>` | Returns an observable for messages of a given event name. Defaults to `message`. |
| `close()`       | `close(): void`                                              | Manually closes the connection.                                                  |
