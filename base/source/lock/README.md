# Lock

This module provides a robust, provider-based resource locking mechanism to prevent race conditions in both distributed server-side and client-side environments.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Lock](#lock)
  - [LockProvider](#lockprovider)
  - [Backends](#backends)
- [Usage](#usage)
  - [Basic Usage with `use`](#basic-usage-with-use)
  - [Manual Control with `acquire` and `release`](#manual-control-with-acquire-and-release)
  - [Handling Timeouts](#handling-timeouts)
  - [Using Prefixed Locks](#using-prefixed-locks)
  - [Checking if a Lock Exists](#checking-if-a-lock-exists)
  - [Configuration](#configuration)
    - [Server-side with MongoDB](#server-side-with-mongodb)
    - [Client-side with Web Locks API](#client-side-with-web-locks-api)
- [API Summary](#api-summary)

## Features

- **Pluggable Backends**: Supports different locking implementations for various environments.
  - **MongoDB**: For distributed server-side locking. Includes automatic lock renewal.
  - **Web Locks API**: For client-side locking within a browser context.
- **Scoped Providers**: Create prefixed lock providers to avoid resource name collisions between different parts of your application.
- **Flexible Acquisition**: Acquire locks with optional timeouts and choose whether to throw an error or return a boolean on failure.
- **Safe `use` Method**: Execute a function within a lock with automatic release, even if the function throws an error.
- **Manual Control**: Provides `acquire` and `release` methods for fine-grained control over the lock's lifecycle.

## Core Concepts

### Lock

A `Lock` instance represents a mutual exclusion lock for a specific resource, identified by a string. Once a lock is acquired, no other process can acquire a lock for the same resource until it is released.

### LockProvider

The `LockProvider` is a factory responsible for creating `Lock` instances. It allows for the creation of scoped or prefixed locks, which is useful for organizing locks and preventing name collisions in larger applications.

### Backends

This module offers two primary backends:

1.  **`MongoLock`**: A server-side implementation designed for distributed systems. It uses a MongoDB collection to manage lock state. It features an automatic renewal mechanism: a lock is acquired with a short expiration time and is periodically refreshed in the background as long as the lock controller is active. If the process holding the lock crashes, the lock automatically expires, preventing deadlocks.

2.  **`WebLock`**: A client-side implementation that leverages the browser's native [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API). This is ideal for managing access to shared resources within a single browser tab or across multiple tabs of the same origin.

## Usage

### Basic Usage with `use`

The `use` method is the safest and recommended way to work with locks. It automatically acquires the lock, executes your function, and ensures the lock is released afterward, even if an error occurs.

```typescript
import { inject } from '@tstdl/base/injector';
import { LockProvider } from '@tstdl/base/lock';

class ProductService {
  #lockProvider = inject(LockProvider);

  async updateProductPrice(productId: string, newPrice: number): Promise<void> {
    const lock = this.#lockProvider.get(`product:${productId}`);

    // Try to acquire the lock for 5 seconds. Throws an error if it fails.
    const { success } = await lock.use(5000, true, async (controller) => {
      // Critical section: This code will only be executed by one process at a time.
      console.log('Lock acquired for product', productId);

      const product = await getProductFromDatabase(productId);
      product.price = newPrice;
      await saveProductToDatabase(product);

      // The lock is automatically released when this function returns.
    });

    if (success) {
      console.log('Product price updated successfully.');
    }
  }
}
```

### Manual Control with `acquire` and `release`

For more complex scenarios, you can manually manage the lock's lifecycle using `acquire` and `release`.

```typescript
import { inject } from '@tstdl/base/injector';
import { LockProvider, type LockController } from '@tstdl/base/lock';

class ReportGenerator {
  #lockProvider = inject(LockProvider);

  async generateDailyReport(): Promise<void> {
    const lock = this.#lockProvider.get('daily-report-generation');
    let controller: LockController | false = false;

    try {
      // Try to acquire the lock indefinitely. Throws if it fails (which it won't with an infinite timeout).
      controller = await lock.acquire(undefined, true);
      console.log('Lock acquired for daily report generation.');

      // Perform a long-running task...
      await this.runGenerationProcess(controller);
    }
    catch (error) {
      console.error('Failed to generate report:', error);
    }
    finally {
      if (controller) {
        await controller.release();
        console.log('Lock released.');
      }
    }
  }

  private async runGenerationProcess(controller: LockController) {
    // ... generation logic
    // The MongoLock implementation automatically renews the lock in the background.
    // You can check `controller.lost` to see if renewal failed (e.g., due to network issues).
  }
}
```

### Handling Timeouts

You can control the behavior when a lock cannot be acquired within the specified timeout by setting the `throwOnFail` parameter.

**Throwing an error (throwOnFail: true)**

```typescript
import { LockProvider } from '@tstdl/base/lock';

const lockProvider = inject(LockProvider);
const lock = lockProvider.get('some-resource');

try {
  await lock.use(1000, true, async () => {
    // ...
  });
} catch (error) {
  console.error('Could not acquire lock within 1 second.');
}
```

**Returning a result object (throwOnFail: false)**

```typescript
import { LockProvider } from '@tstdl/base/lock';

const lockProvider = inject(LockProvider);
const lock = lockProvider.get('some-resource');

const result = await lock.use(1000, false, async () => {
  return 'Task complete';
});

if (result.success) {
  console.log(result.result); // 'Task complete'
} else {
  console.log('Could not acquire lock, task did not run.');
}
```

### Using Prefixed Locks

Use `prefix()` on a `LockProvider` to create a scoped provider. This is useful for avoiding key collisions between different modules or features.

```typescript
import { inject } from '@tstdl/base/injector';
import { LockProvider } from '@tstdl/base/lock';

// In user-module
const userLockProvider = inject(LockProvider).prefix('users');
const userLock = userLockProvider.get('update:123'); // Actual resource key: 'users:update:123'

// In product-module
const productLockProvider = inject(LockProvider).prefix('products');
const productLock = productLockProvider.get('update:123'); // Actual resource key: 'products:update:123'
```

### Checking if a Lock Exists

You can check if a lock is currently held without trying to acquire it.

```typescript
import { LockProvider } from '@tstdl/base/lock';

const lockProvider = inject(LockProvider);
const lock = lockProvider.get('my-resource');

if (await lock.exists()) {
  console.log('The resource is currently locked.');
} else {
  console.log('The resource is not locked.');
}
```

### Configuration

#### Server-side with MongoDB

To use `MongoLock` on the server, you need to configure it with a MongoDB repository.

```typescript
// In your application's bootstrap file
import { configureMongoLock } from '@tstdl/base/lock/mongo';
import { MongoEntityRepository } from '@tstdl/base/database/mongo';
import type { MongoLockEntity } from '@tstdl/base/lock/mongo';

// Configure the repository for storing lock documents
const lockRepositoryConfig = {
  provider: MongoEntityRepository<MongoLockEntity>,
  arg: {
    collectionName: 'locks',
    databaseName: 'my-app-db'
    // ... other mongo collection configuration
  }
};

configureMongoLock(lockRepositoryConfig);
```

#### Client-side with Web Locks API

In a browser environment, simply call `configureWebLock`.

```typescript
// In your client-side bootstrap file
import { configureWebLock } from '@tstdl/base/lock/web';

configureWebLock();
```

## API Summary

| Class / Function | Signature | Description |
| :--- | :--- | :--- |
| `Lock` | `abstract class` | The base class for a resource lock. |
| | `acquire<Throw>(timeout: number \| undefined, throwOnFail: Throw): Promise<AcquireResult<Throw>>` | Acquires the lock, returning a controller. Must be manually released. |
| | `use<Throw, R>(timeout: number \| undefined, throwOnFail: Throw, func: LockedFunction<R>): Promise<UsingResult<Throw, R>>` | Acquires the lock, executes a function, and automatically releases it. |
| | `exists(): Promise<boolean>` | Checks if the lock is currently held by any process. |
| `LockProvider` | `abstract class` | A factory for creating `Lock` instances. |
| | `prefix(prefix: string): LockProvider` | Creates a new provider that prefixes all resource names. |
| | `get(resource: string): Lock` | Gets a `Lock` instance for a specific resource. |
| `LockController` | `interface` | A controller object returned by a successful `acquire` call. |
| | `lost: boolean` | `true` if the lock was lost (e.g., failed to renew). |
| | `release(): void \| Promise<void>` | Releases the lock. |
| `configureMongoLock` | `(lockRepositoryConfig: MongoRepositoryConfig<MongoLockEntity>, register?: boolean): void` | Configures the application to use the MongoDB-backed lock provider. |
| `configureWebLock` | `(): void` | Configures the application to use the Web Locks API-backed lock provider. |