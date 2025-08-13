# @tstdl/base/sse

A module providing both client-side and server-side utilities for working with Server-Sent Events (SSE). It offers a reactive client based on RxJS and a streamlined source class for server-side implementations.

## Table of Contents
- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Client-Side (`ServerSentEvents`)](#client-side-server-sent-events)
  - [Server-Side (`ServerSentEventsSource`)](#server-side-server-sent-events-source)
- [Usage](#usage)
  - [Server-Side Example](#server-side-example)
  - [Client-Side Example](#client-side-example)
- [API Summary](#api-summary)
  - [Client: `ServerSentEvents`](#client-server-sent-events)
  - [Server: `ServerSentEventsSource`](#server-server-sent-events-source)
  - [Enums & Types](#enums--types)

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

Here is an example of an API endpoint that creates an SSE stream and sends data to the client.

```typescript
import { ServerSentEventsSource } from '@tstdl/base/sse';
import { sleep } from '@tstdl/base/utils';

// Inside your API controller or route handler
async function handleSseRequest(request, response) {
  const source = new ServerSentEventsSource();

  // Set the required SSE headers
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  
  // Pipe the readable stream to the response
  source.readable.pipeTo(response.writable);

  // Send events in a loop
  (async () => {
    try {
      for (let i = 0; i < 10; i++) {
        if (source.closed.value) {
          break;
        }

        await source.sendJson({
          name: 'update',
          data: { message: `Update #${i + 1}`, timestamp: new Date() },
          id: `update-${i}`
        });

        await sleep(1000); // Wait for 1 second
      }
    } catch (error) {
      console.error('Error sending SSE data:', error);
    } finally {
      // Always close the source when done or on error
      await source.close();
    }
  })();
}
```

### Client-Side Example

Here is how a client would consume the stream from the server example above.

```typescript
import { ServerSentEvents, ServerSentEventsState } from '@tstdl/base/sse';
import { takeUntil, Subject } from 'rxjs';

const destroy$ = new Subject<void>();

// The URL of your SSE endpoint
const sseUrl = '/api/my-events';

// Initialize the SSE client
const sse = new ServerSentEvents(sseUrl, { withCredentials: true });

// (1) Subscribe to connection state changes
sse.state$
  .pipe(takeUntil(destroy$))
  .subscribe(state => {
    switch(state) {
      case ServerSentEventsState.Connecting:
        console.log('Connecting to SSE stream...');
        break;
      case ServerSentEventsState.Open:
        console.log('SSE connection established.');
        break;
      case ServerSentEventsState.Closed:
        console.log('SSE connection closed.');
        break;
    }
  });

// (2) Subscribe to a specific named event ('update')
sse.message$('update')
  .pipe(takeUntil(destroy$))
  .subscribe(event => {
    const data = JSON.parse(event.data);
    console.log('Received update:', data);
  });

// (3) Handle any connection errors
sse.error$
  .pipe(takeUntil(destroy$))
  .subscribe(error => {
    console.error('SSE Error:', error);
  });

// (4) Clean up when the connection is no longer needed
function cleanup() {
  sse.close();
  destroy$.next();
  destroy$.complete();
}
```

## API Summary

### Client: `ServerSentEvents`
A reactive wrapper for the browser's `EventSource` API.

- `constructor(url: string, options?: EventSourceInit)`: Creates a new SSE client instance.
- `state: ServerSentEventsState`: (Getter) Synchronously gets the current connection state.
- `state$: Observable<ServerSentEventsState>`: Emits the connection state whenever it changes.
- `isOpen$: Observable<boolean>`: Emits `true` when the connection is open, `false` otherwise.
- `isConnecting$: Observable<boolean>`: Emits `true` when the connection is being established.
- `isClosed$: Observable<boolean>`: Emits `true` when the connection is closed.
- `open$: Observable<void>`: Emits when the connection is successfully opened.
- `close$: Observable<void>`: Emits when the connection is closed.
- `error$: Observable<Event>`: Emits when a connection error occurs.
- `message$(event?: string): Observable<MessageEvent<string>>`: Returns an observable for messages of a given event name. Defaults to the standard `message` event.
- `close(): void`: Manually closes the connection.

### Server: `ServerSentEventsSource`
A helper class to create and manage an SSE stream on the server.

- `constructor()`: Creates a new source instance.
- `readable: ReadableStream<string>`: The readable stream to be sent in the HTTP response body.
- `closed: ReadonlySignal<boolean>`: A signal that is `true` if the stream has been closed.
- `error: ReadonlySignal<Error | undefined>`: A signal that holds the error if the stream was closed due to one.
- `close(): Promise<void>`: Closes the stream.
- `sendComment(comment: string): Promise<void>`: Sends a comment to the client.
- `sendText(event: ServerSentTextEvent): Promise<void>`: Sends a text-based event.
- `sendJson(event: ServerSentJsonEvent): Promise<void>`: Sends a JSON-based event (data is automatically stringified).

### Enums & Types

- **`ServerSentEventsState`**: Enum with values `Connecting`, `Open`, `Closed`.
- **`ServerSentEvent`**: A union type representing a potential event. It has the following optional properties:
  - `name?: string`: The event name.
  - `data?: string | any`: The event payload.
  - `id?: string`: A unique ID for the event.
  - `retry?: number`: A recommended reconnection time in milliseconds for the client.