# ORM Module

A powerful, code-first, decorator-based abstraction layer built on top of [Drizzle ORM](https://orm.drizzle.team/). It simplifies data access and management in a type-safe manner for PostgreSQL databases.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Entities](#entities)
  - [Repositories](#repositories)
  - [Decorators](#decorators)
  - [Querying](#querying)
  - [Transactions](#transactions)
  - [Schema Generation](#schema-generation)
- [Usage](#usage)
  - [1. Define Entities](#1-define-entities)
  - [2. Access Repositories](#2-access-repositories)
  - [3. Perform Operations (CRUD)](#3-perform-operations-crud)
  - [4. Handle Transactions](#4-handle-transactions)
- [API Summary](#api-summary)
  - [Decorators](#decorators-1)
  - [EntityRepository Methods](#entityrepository-methods)

## Features

- **Code-First Approach**: Define your database schema directly in TypeScript using classes and decorators.
- **Repository Pattern**: A clean, consistent API for all CRUD (Create, Read, Update, Delete) operations.
- **Type-Safe Querying**: A MongoDB-like query syntax that is fully typed based on your entity models.
- **Automatic Schema Generation**: Integrates with `drizzle-kit` to generate SQL migrations from your entity classes.
- **Built-in Transactions**: Simple and robust transaction management to ensure data integrity.
- **Transparent Encryption**: Encrypt sensitive data at the column level with a single `@Encrypted()` decorator.
- **Dependency Injection**: Seamlessly integrated with the application's dependency injection container.

## Core Concepts

### Entities

Entities are classes that represent your database tables. They are the foundation of the ORM.

- Extend `Entity` to get a default `id` primary key and standard metadata fields (`revision`, `createTimestamp`, `deleteTimestamp`, `attributes`). This is suitable for most tables.
- Extend `EntityWithoutMetadata` for simpler tables (e.g., join tables) that only require an `id`.

```typescript
import { Entity, EntityWithoutMetadata } from '@tstdl/base/orm';
import { StringProperty } from '@tstdl/base/schema';

// An entity with standard metadata columns
export class User extends Entity {
  @StringProperty()
  name: string;
}

// A simpler entity for a join table, without metadata
export class UserRole extends EntityWithoutMetadata {
  @StringProperty()
  userId: string;

  @StringProperty()
  roleId: string;
}
```

### Repositories

Data access is handled through repositories, which provide a dedicated API for each entity. There are two ways to get a repository:

1.  **Default Repository Instance**: For basic CRUD operations, you can directly inject a default repository instance for an entity without creating a custom class.

    ```typescript
    import { injectRepository } from '@tstdl/base/orm/server';
    import { User } from './user.model.js';

    // Directly get a repository instance
    const userRepository = injectRepository(User);
    const user = await userRepository.load('user-id-123');
    ```

2.  **Custom Repository Class**: To add custom data access methods, create a class that extends `getRepository(MyEntity)`.

    ```typescript
    import { Singleton, inject } from '@tstdl/base/injector';
    import { getRepository } from '@tstdl/base/orm/server';
    import { User } from './user.model.js';

    @Singleton()
    export class UserRepository extends getRepository(User) {
      async findAdmins(): Promise<User[]> {
        return this.loadManyByQuery({ isAdmin: true });
      }
    }

    // Inject your custom repository
    const userRepository = inject(UserRepository);
    const admins = await userRepository.findAdmins();
    ```

### Decorators

Decorators map class properties to database columns and define table constraints.

-   **Table Decorators (on class):**
    -   `@Table({ name: '...', schema: '...' })`: Sets the table name and schema. Defaults to a snake_case version of the class name.
    -   `@Unique(['prop1', 'prop2'])`: Creates a composite unique constraint.
    -   `@Index(['prop1', 'prop2'])`: Creates a composite index.
    -   `@ForeignKey(() => Target, ['thisCol'], ['targetCol'])`: Creates a composite foreign key.
    -   `@Check('name', (table) => ...)`: Defines a custom SQL `CHECK` constraint.

-   **Column Decorators (on property):**
    -   `@StringProperty()`, `@Integer()`, `@NumberProperty()`, `@BooleanProperty()`: Define basic data types.
    -   `@Uuid()`: A native `uuid` column. Can be configured with `{ defaultRandom: true }`.
    -   `@Timestamp()`: A Unix timestamp (milliseconds) stored as `timestamp with time zone`.
    -   `@NumericDate()`: A date stored as a number (`YYYYMMDD`) in a `date` column.
    -   `@Enumeration(MyEnum)`: Maps a TypeScript enum to a PostgreSQL enum type.
    -   `@Json()`: Maps a property to a `jsonb` column.
    -   `@Encrypted()`: Transparently encrypts the column data (underlying type is `bytea`).
    -   `@Embedded(MyClass)`: Inlines the properties of another class.
    -   `@PrimaryKey()`: Marks a property as the primary key.
    -   `@Unique()`: Creates a unique constraint on a single column.
    -   `@Index()`: Creates an index on a single column.
    -   `@References(() => OtherEntity)`: Creates a foreign key to the `id` of another entity.

### Querying

The ORM uses a type-safe, MongoDB-like query syntax. The query object is mapped to the entity's properties and converted to a SQL `WHERE` clause. Top-level properties are implicitly joined with `AND`.

```typescript
import { currentTimestamp } from '@tstdl/base/utils';

// Simple equality
const user = await userRepository.loadByQuery({ mail: 'test@example.com' });

// Multiple conditions (AND)
const activeAdmins = await userRepository.loadManyByQuery({
  role: 'admin',
  status: { $neq: 'inactive' }
});

// Logical OR
const highPriorityTasks = await taskRepository.loadManyByQuery({
  $or: [
    { priority: 'high' },
    { dueDate: { $lt: currentTimestamp() } }
  ]
});
```

**Supported Operators:** `$eq`, `$neq`, `$in`, `$nin`, `$lt`, `$lte`, `$gt`, `$gte`, `$and`, `$or`, `$nor`, `$not`, `$regex`.

### Transactions

The `Transactional` base class, which all repositories extend, provides robust transaction management.

-   **`this.transaction(async (tx) => { ... })`**: The primary method. It starts a transaction, executes the callback, and automatically commits on success or rolls back on error.
-   **`this.withTransaction(tx)`**: Creates a new repository instance bound to an existing transaction, allowing you to pass the transaction context between different services and repositories.

### Schema Generation

The code-first approach integrates with `drizzle-kit` to automate database migrations.

1.  **Define Entities**: Write your entity classes with decorators.
2.  **Expose Schema**: Create a central file (e.g., `schemas.ts`) that exports all Drizzle tables using `databaseSchema.getTable(MyEntity)`.
3.  **Configure `drizzle-kit`**: Point your `drizzle.config.ts` to the schema file.
4.  **Generate Migration**: Run `drizzle-kit generate`. It will compare your code-defined schema with the database state and create a new SQL migration file.
5.  **Apply Migration**: Use the `migrate` function from `@tstdl/base/orm/server` to apply pending migrations, typically on application startup.

## Usage

This example demonstrates defining two related entities (`User` and `Pet`), accessing their repositories, and performing operations within a transaction.

### 1. Define Entities

```typescript
// user.model.ts
import { Entity, Table, Unique } from '@tstdl/base/orm';
import { StringProperty } from '@tstdl/base/schema';

@Table({ name: 'users', schema: 'public' })
export class User extends Entity {
  @StringProperty()
  name: string;

  @StringProperty()
  @Unique()
  email: string;
}

// pet.model.ts
import { Entity, References, Table, Uuid } from '@tstdl/base/orm';
import { StringProperty } from '@tstdl/base/schema';
import { User } from './user.model.js';

@Table({ name: 'pets', schema: 'public' })
export class Pet extends Entity {
  @StringProperty()
  name: string;

  @Uuid()
  @References(() => User)
  ownerId: string;
}
```

### 2. Access Repositories

In a service, inject the repositories you need.

```typescript
// user.service.ts
import { Singleton, inject } from '@tstdl/base/injector';
import { injectRepository } from '@tstdl/base/orm/server';
import { Transactional } from '@tstdl/base/orm/server';
import { User } from './user.model.js';
import { Pet } from './pet.model.js';

@Singleton()
export class UserService extends Transactional {
  readonly #userRepository = injectRepository(User);
  readonly #petRepository = injectRepository(Pet);

  // ... service methods
}
```

### 3. Perform Operations (CRUD)

Use the repository instances to interact with the database.

```typescript
// Inside a method of UserService...

// Create a user
const newUser = await this.#userRepository.insert({
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
});

// Read a user by ID
const user = await this.#userRepository.load(newUser.id);

// Read users by query
const allJanes = await this.#userRepository.loadManyByQuery({
  name: 'Jane Doe'
});

// Update a user
await this.#userRepository.update(newUser.id, { name: 'Jane Smith' });

// Delete a user (soft delete)
await this.#userRepository.delete(newUser.id);
```

### 4. Handle Transactions

Wrap multiple operations in a transaction to ensure they all succeed or fail together.

```typescript
// Inside UserService
async function onboardUserWithPet(userName: string, userEmail: string, petName: string): Promise<User> {
  // All operations inside this block are atomic.
  return this.transaction(async (tx) => {
    // Get repository instances bound to this transaction
    const userRepository = this.#userRepository.withTransaction(tx);
    const petRepository = this.#petRepository.withTransaction(tx);

    const newUser = await userRepository.insert({
      name: userName,
      email: userEmail
    });

    await petRepository.insert({
      name: petName,
      ownerId: newUser.id
    });

    return newUser;
  });
}
```

## API Summary

### Decorators

| Decorator                                                | Type             | Description                                                                       |
| -------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `@Table({ name?, schema? })`                             | Class            | Specifies table name and schema.                                                  |
| `@PrimaryKey()`                                          | Property         | Marks a property as the primary key.                                              |
| `@Unique(columns?, options?)`                            | Class / Property | Defines a unique constraint.                                                      |
| `@Index(columns?, options?)`                             | Class / Property | Defines a database index.                                                         |
| `@Check(name, builder)`                                  | Class            | Defines a custom SQL `CHECK` constraint.                                          |
| `@ForeignKey(target, columns, foreignColumns, options?)` | Class            | Defines a composite foreign key relationship.                                     |
| `@References(target, targetColumn?)`                     | Property         | Defines a foreign key relationship to another entity's column (defaults to `id`). |
| `@Encrypted()`                                           | Property         | Marks a column for transparent encryption (stored as `bytea`).                    |
| `@Embedded(type, { prefix? })`                           | Property         | Inlines properties from another class into the table.                             |
| `@Uuid({ defaultRandom? })`                              | Property         | Defines a `uuid` column.                                                          |
| `@Timestamp()`                                           | Property         | Defines a `timestamp with time zone` column, storing a number (milliseconds).     |
| `@NumericDate()`                                         | Property         | Defines a `date` column, storing a number (`YYYYMMDD`).                           |
| `@Json({ schema? })`                                     | Property / Class | Defines a `jsonb` column with optional schema validation.                         |

### EntityRepository Methods

| Method                             | Arguments                                                 | Returns                      | Description                                                              |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `load(id)`                         | `id: string`                                              | `Promise<T>`                 | Loads a single entity by ID. Throws if not found.                        |
| `tryLoad(id)`                      | `id: string`                                              | `Promise<T \| undefined>`    | Loads a single entity by ID. Returns `undefined` if not found.           |
| `loadByQuery(query, options?)`     | `query: Query<T>, options?: LoadOptions<T>`               | `Promise<T>`                 | Loads the first entity matching the query. Throws if not found.          |
| `loadManyByQuery(query, options?)` | `query: Query<T>, options?: LoadManyOptions<T>`           | `Promise<T[]>`               | Loads all entities matching the query.                                   |
| `insert(entity)`                   | `entity: NewEntity<T>`                                    | `Promise<T>`                 | Inserts a new entity.                                                    |
| `insertMany(entities)`             | `entities: NewEntity<T>[]`                                | `Promise<T[]>`               | Inserts multiple new entities.                                           |
| `upsert(target, entity, update?)`  | `target: Path, entity: NewEntity<T>, update?: EntityUpdate<T>` | `Promise<T>`                 | Inserts an entity or updates it on conflict.                             |
| `update(id, update)`               | `id: string, update: EntityUpdate<T>`                     | `Promise<T>`                 | Updates an entity by its ID.                                             |
| `updateByQuery(query, update)`     | `query: Query<T>, update: EntityUpdate<T>`                | `Promise<T>`                 | Updates the first entity matching a query.                               |
| `delete(id, metadata?)`            | `id: string, metadata?: EntityMetadataUpdate`             | `Promise<T>`                 | Soft-deletes an entity by its ID (if it has metadata).                   |
| `hardDelete(id)`                   | `id: string`                                              | `Promise<T>`                 | Permanently deletes an entity by its ID.                                 |
| `countByQuery(query)`              | `query: Query<T>`                                         | `Promise<number>`            | Counts entities matching a query.                                        |
| `hasByQuery(query)`                | `query: Query<T>`                                         | `Promise<boolean>`           | Checks if any entity matches a query.                                    |
| `withTransaction(tx)`              | `tx: Transaction`                                         | `this`                       | Returns a new repository instance bound to a specific transaction.       |
| `transaction(handler)`             | `handler: (tx: Transaction) => Promise<R>`                | `Promise<R>`                 | Executes a handler within a new, automatically managed transaction.      |
