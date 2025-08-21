# Message Bus

A flexible, RxJS-based message bus module for in-process and cross-context communication, designed for dependency injection.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Implementations](#implementations)
  - [MessageBus](#messagebus)
  - [MessageBusProvider](#messagebusprovider)
  - [Channels](#channels)
  - [Message Observables](#message-observables)
- [Usage](#usage)
  - [1. Configuration](#1-configuration)
  - [2. Injecting a Message Bus](#2-injecting-a-message-bus)
  - [3. Publishing Messages](#3-publishing-messages)
  - [4. Subscribing to Messages](#4-subscribing-to-messages)
  - [Example: Cross-Tab Communication](#example-cross-tab-communication)
  - [5. Cleanup](#5-cleanup)
- [API Summary](#api-summary)

## Features

- **Decoupled Communication**: Enables different parts of an application to communicate without direct dependencies.
- **Two Implementations**:
  - **`LocalMessageBus`**: For efficient in-process communication (e.g., within a single browser tab or Node.js process).
  - **`BroadcastChannelMessageBus`**: For cross-context communication between browser tabs, windows, or iframes of the same origin.
- **Provider-Based**: Integrates seamlessly with dependency injection containers.
- **Channel-Scoped**: Isolates messages into named channels to prevent crosstalk.
- **RxJS Integration**: Leverages RxJS observables for powerful, reactive message handling.
- **Clear Message Scopes**: Differentiates between messages from other instances (`messages$`) and all messages, including self-published ones (`allMessages$`).
- **Graceful Shutdown**: Implements `AsyncDisposable` for proper resource management and cleanup.

## Core Concepts

### Implementations

The module offers two primary implementations tailored for different communication scopes. The choice of implementation is determined by which configuration function you call at startup.

- **`LocalMessageBus`**
  - **Use Case**: Communication within a single JavaScript execution context (e.g., a single browser tab or a Node.js application).
  - **Mechanism**: Uses a shared in-memory RxJS `Subject` for each channel, making it highly efficient for in-process messaging.

- **`BroadcastChannelMessageBus`**
  - **Use Case**: Communication between different browsing contexts of the same origin (e.g., synchronizing state across multiple open tabs).
  - **Mechanism**: Wraps the standard web `BroadcastChannel` API, allowing different tabs or windows to communicate.

### MessageBus

The `MessageBus<T>` is the core abstract class. It represents a communication channel for messages of type `T`. It provides methods to publish messages and observables to subscribe to them. Each `MessageBus` instance is tied to a specific named channel.

### MessageBusProvider

The `MessageBusProvider` is a factory responsible for creating and managing `MessageBus` instances for each channel. When you inject a `MessageBus`, this provider ensures that all requests for the same channel share the appropriate underlying resource (like a `Subject` or a `BroadcastChannel` instance).

### Channels

Channels are simple strings that act as identifiers for a message stream. Messages published to a channel are only received by subscribers to that same channel. This allows multiple, independent communication streams to coexist within the same application.

### Message Observables

Each `MessageBus` instance exposes two distinct RxJS observables:

- `messages$: Observable<T>`: Emits messages published by **other** instances on the same channel. This is useful for reacting to external events, for example, a state change triggered in another browser tab.
- `allMessages$: Observable<T>`: Emits **all** messages on the channel, including those published by the current instance itself. This is useful when you want to react to a message regardless of its origin, such as for logging or updating the UI that triggered the action.

## Usage

### 1. Configuration

Before injecting a `MessageBus`, register its provider in your application's DI container. Choose the provider that fits your application's needs.

**For in-process communication (most common for backend or single-page apps):**

```typescript
import { configureLocalMessageBus } from '@tstdl/base/message-bus';

// At application startup
configureLocalMessageBus();
```

**For cross-tab/window communication in browsers:**

```typescript
import { configureBroadcastChannelMessageBus } from '@tstdl/base/message-bus';

// At application startup
configureBroadcastChannelMessageBus();
```

### 2. Injecting a Message Bus

Use your DI framework's injection mechanism to get a `MessageBus` instance for a specific channel. The channel name is passed as the resolution argument.

```typescript
import { inject } from '@tstdl/base/injector';
import { MessageBus } from '@tstdl/base/message-bus';

// Define the type of messages for your channel
type ProductEvent = { type: 'added-to-cart'; productId: string };

class ProductService {
  private readonly productEventBus = inject(MessageBus<ProductEvent>, 'product-events');

  // ...
}
```

### 3. Publishing Messages

Use the `publish()` or `publishAndForget()` methods to send messages to the channel.

```typescript
class ProductService {
  private readonly productEventBus = inject(MessageBus<ProductEvent>, 'product-events');

  async addProductToCart(productId: string): Promise<void> {
    // Publish a message and wait for the operation to complete
    await this.productEventBus.publish({ type: 'added-to-cart', productId });
    console.log('Product event published.');
  }

  removeProductFromCart(productId: string): void {
    // Publish a message without waiting (fire and forget)
    this.productEventBus.publishAndForget({ type: 'removed-from-cart', productId });
  }
}
```

### 4. Subscribing to Messages

Subscribe to the `messages$` or `allMessages$` observables to receive and react to messages. Always remember to unsubscribe to prevent memory leaks.

```typescript
import { Subscription } from 'rxjs';

class CartNotificationService {
  private readonly productEventBus = inject(MessageBus<ProductEvent>, 'product-events');
  private readonly subscription = new Subscription();

  constructor() {
    // Listen to *all* events, including those published by this instance, to update the UI
    const sub = this.productEventBus.allMessages$.subscribe((event) => {
      console.log('A product event occurred:', event);
      // e.g., show a toast notification
    });

    this.subscription.add(sub);
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }
}
```

### Example: Cross-Tab Communication

This example shows how `BroadcastChannelMessageBus` can synchronize a user's session status across multiple browser tabs.

```typescript
// 1. Configure for cross-tab communication at startup
// configureBroadcastChannelMessageBus();

// 2. Define the message type
type SessionEvent = { type: 'logout' };

// 3. In your authentication service (or similar)
class AuthService {
  private readonly sessionBus = inject(MessageBus<SessionEvent>, 'session-channel');

  async logout(): Promise<void> {
    // ... perform logout logic ...
    await this.sessionBus.publish({ type: 'logout' });
  }
}

// 4. In a root component or service that manages UI state
class SessionWatcher {
  private readonly sessionBus = inject(MessageBus<SessionEvent>, 'session-channel');
  private readonly subscription = new Subscription();

  constructor() {
    // Listen only to messages from *other* tabs
    const sub = this.sessionBus.messages$.subscribe((event) => {
      if (event.type === 'logout') {
        console.log('Logout event received from another tab. Redirecting to login page.');
        // Redirect user to the login page
        window.location.href = '/login';
      }
    });

    this.subscription.add(sub);
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }
}
```

### 5. Cleanup

`MessageBus` instances are `AsyncDisposable`. If you manage their lifecycle manually, clean them up to release underlying resources (like closing the BroadcastChannel).

```typescript
import { disposeAsync } from '@tstdl/base/disposable';

const bus = new LocalMessageBus(...);
// ... use the bus ...

// When it's no longer needed
await bus[Symbol.asyncDispose]();
```

If the bus is managed by a DI container, this cleanup is often handled automatically based on the component's lifecycle.

## API Summary

### `MessageBus<T>`

The core abstract class for a message bus instance.

| Member | Signature / Type | Description |
| :--- | :--- | :--- |
| `messages$` | `Observable<T>` | An observable for messages received from other instances. |
| `allMessages$` | `Observable<T>` | An observable for all messages, including those published by the current instance. |
| `publish()` | `(message: T) => Promise<void>` | Asynchronously publishes a message to the channel. |
| `publishAndForget()` | `(message: T) => void` | Publishes a message without awaiting completion (fire and forget). |
| `[disposeAsync]()` | `() => Promise<void>` | Disposes the message bus and releases its resources. |

### Providers

| Class | Description |
| :--- | :--- |
| `LocalMessageBusProvider` | Provides `LocalMessageBus` instances for same-context communication. |
| `BroadcastChannelMessageBusProvider` | Provides `BroadcastChannelMessageBus` instances for cross-context communication. |

### Configuration Functions

| Function | Description |
| :--- | :--- |
| `configureLocalMessageBus()` | Registers `LocalMessageBusProvider` as the default provider for `MessageBus`. |
| `configureBroadcastChannelMessageBus()` | Registers `BroadcastChannelMessageBusProvider` as the default provider for `MessageBus`. |
