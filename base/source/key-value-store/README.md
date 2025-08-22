# Key-Value Store

A flexible and backend-agnostic module for storing and retrieving key-value pairs, scoped by module names.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Configuration](#configuration)
    - [PostgreSQL Backend](#postgresql-backend)
    - [MongoDB Backend](#mongodb-backend)
  - [Getting a Store Instance](#getting-a-store-instance)
  - [Defining a Typed Store](#defining-a-typed-store)
  - [Basic Operations](#basic-operations)
- [API Summary](#api-summary)

## Features

- Simple, promise-based API for all key-value operations.
- Type-safe storage and retrieval using generic type arguments.
- Module-based scoping to prevent key collisions between different parts of an application.
- Backend-agnostic `KeyValueStore` abstract class for consistent usage.
- Includes ready-to-use implementations for PostgreSQL and MongoDB.

## Core Concepts

### KeyValueStore

The `KeyValueStore` is the primary abstract class for interacting with the store. All operations are asynchronous and return Promises. You obtain an instance of this class for a specific "module" to perform operations.

### Module Scoping

Each `KeyValueStore` instance is tied to a unique `module` string (e.g., 'user-settings', 'app-cache'). This acts as a namespace, ensuring that keys used in one module do not conflict with keys in another, even if they share the same name. All operations performed on a store instance are automatically scoped to its module.

### Backends

This package provides two concrete implementations for the `KeyValueStore`:

-   **`PostgresKeyValueStore`**: Stores data in a PostgreSQL database. It's the recommended default for applications already using the ORM.
-   **`MongoKeyValueStore`**: Stores data in a MongoDB collection.

The appropriate backend is registered with the dependency injector during application bootstrap, allowing you to inject and use the `KeyValueStore` without needing to know the underlying implementation details.

## Usage

### Configuration

First, you need to configure the desired backend in your application's bootstrap file.

#### PostgreSQL Backend

The PostgreSQL implementation is ideal for projects already using the `@tstdl/base/orm` module.

```typescript
// in your bootstrap.ts
import { configurePostgresKeyValueStore, migratePostgresKeyValueStoreSchema } from '@tstdl/base/key-value-store/postgres';
import { Application } from '@tstdl/base/application';

async function bootstrap() {
  // ... other configurations
  configurePostgresKeyValueStore();
}

async function main() {
  // ... migrate other schemas
  await migratePostgresKeyValueStoreSchema();
}

Application.run({ bootstrap }, main);
```

#### MongoDB Backend

For MongoDB-based applications, configure the Mongo provider and specify the repository configuration.

```typescript
// in your bootstrap.ts
import { configureMongoKeyValueStore } from '@tstdl/base/key-value-store/mongo';
import { Application } from '@tstdl/base/application';

async function bootstrap() {
  // ... other configurations
  configureMongoKeyValueStore({
    collectionName: 'key-values',
    databaseName: 'my-app-db'
  });
}

Application.run({ bootstrap });
```

### Getting a Store Instance

Once configured, you can inject `KeyValueStore` and provide the module name as an argument.

```typescript
import { KeyValueStore } from '@tstdl/base/key-value-store';
import { Injector } from '@tstdl/base/injector';

// Get a store for application caching
const appCacheStore = Injector.resolve(KeyValueStore, 'app-cache');

// Get a store for user-specific settings
const userSettingsStore = Injector.resolve(KeyValueStore, 'user-settings');
```

### Defining a Typed Store

You can define a type for your key-value map to get full type safety and autocompletion.

```typescript
import { KeyValueStore } from '@tstdl/base/key-value-store';
import { Injector } from '@tstdl/base/injector';

type UserSettings = {
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  language?: string;
  lastLogin: number;
};

const userSettingsStore = Injector.resolve(KeyValueStore<UserSettings>, 'user-settings');

// Now, operations are type-checked
await userSettingsStore.set('theme', 'dark'); // OK
// await userSettingsStore.set('theme', 'blue'); // TypeScript Error
```

### Basic Operations

All examples below assume a typed `userSettingsStore` has been created as shown above.

#### Set a Value

The `set()` method adds or overwrites a key-value pair in the store.

```typescript
await userSettingsStore.set('theme', 'dark');
await userSettingsStore.set('notificationsEnabled', true);
```

#### Get a Value

The `get()` method retrieves a value. It returns `undefined` if the key does not exist.

```typescript
const theme = await userSettingsStore.get('theme'); // 'dark' | 'light' | undefined
console.log(theme); // "dark"

const nonExistent = await userSettingsStore.get('nonExistentKey');
console.log(nonExistent); // undefined
```

#### Get a Value with a Default

You can provide a default value to `get()` that will be returned if the key is not found.

```typescript
const language = await userSettingsStore.get('language', 'en');
console.log(language); // "en" (if 'language' was not previously set)
```

#### Get or Set a Value

The `getOrSet()` method retrieves a value if it exists. If not, it sets the provided value and then returns it. This is useful for initializing settings.

```typescript
// If 'lastLogin' is not set, it will be set to the current timestamp and then returned.
const lastLogin = await userSettingsStore.getOrSet('lastLogin', Date.now());
```

#### Set Multiple Values

The `setMany()` method efficiently sets multiple key-value pairs at once.

```typescript
await userSettingsStore.setMany({
  theme: 'light',
  notificationsEnabled: false
});
```

#### Delete a Key

The `delete()` method removes a key from the store and returns `true` if a key was deleted.

```typescript
const wasDeleted = await userSettingsStore.delete('language');
console.log(wasDeleted); // true
```

#### Delete Multiple Keys

The `deleteMany()` method removes an array of keys from the store.

```typescript
await userSettingsStore.deleteMany(['theme', 'lastLogin']);
```

#### Clear the Store

The `clear()` method removes **all** key-value pairs associated with that specific module.

```typescript
await userSettingsStore.clear(); // Deletes all keys under the 'user-settings' module
```

## API Summary

### `KeyValueStore<KV>`

This is the main abstract class you interact with.

| Method | Parameters | Returns | Description |
| :--- | :--- | :--- | :--- |
| `get<K>(key)` | `key: K` | `Promise<KV[K] \| undefined>` | Gets the value of a key. |
| `get<K, D>(key, defaultValue)` | `key: K`, `defaultValue: D` | `Promise<KV[K] \| D>` | Gets the value of a key, or a default value if not found. |
| `set<K>(key, value)` | `key: K`, `value: KV[K]` | `Promise<void>` | Sets the value for a key. |
| `getOrSet<K>(key, value)` | `key: K`, `value: KV[K]` | `Promise<KV[K]>` | Gets a value, or sets and returns it if it does not exist. |
| `setMany(keyValues)` | `keyValues: Partial<KV>` | `Promise<void>` | Sets multiple key-value pairs. |
| `delete(key)` | `key: keyof KV` | `Promise<boolean>` | Deletes a single key. Returns `true` on success. |
| `deleteMany(keys)` | `keys: (keyof KV)[]` | `Promise<void>` | Deletes multiple keys. |
| `clear()` | | `Promise<void>` | Clears all keys within the store's module. |

### Configuration Functions

| Function | Description |
| :--- | :--- |
| `configurePostgresKeyValueStore(config?)` | Registers the PostgreSQL backend for the `KeyValueStore`. |
| `configureMongoKeyValueStore(config, register?)` | Registers the MongoDB backend for the `KeyValueStore`. |
