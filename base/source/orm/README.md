# ORM Module

A powerful, code-first, decorator-based abstraction layer built on top of [Drizzle ORM](https://orm.drizzle.team/). It simplifies data access and management in a type-safe manner for PostgreSQL databases.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Entities](#entities)
  - [Decorators](#decorators)
  - [Repositories](#repositories)
  - [Querying](#querying)
  - [Transactions](#transactions)
  - [Schema Generation](#schema-generation)
- [Usage](#usage)
  - [1. Define an Entity](#1-define-an-entity)
  - [2. Create a Repository](#2-create-a-repository)
  - [3. Use the Repository](#3-use-the-repository)
  - [4. Run a Transaction](#4-run-a-transaction)
- [API Summary](#api-summary)
  - [Decorators](#decorators-1)
  - [EntityRepository Methods](#entityrepository-methods)

## Features

- **Code-First Approach**: Define your database schema directly in TypeScript using classes and decorators.
- **Repository Pattern**: A clean, consistent API for all CRUD (Create, Read, Update, Delete) operations.
- **Type-Safe Querying**: A MongoDB-like query syntax that is fully typed based on your entity models.
- **Automatic Schema Generation**: Integrates with `drizzle-kit` to generate SQL migrations from your entity classes.
- **Built-in Transactions**: Simple and robust transaction management to ensure data integrity.
- **Transparent Encryption**: Encrypt sensitive data at the column level with a single decorator.
- **Dependency Injection**: Seamlessly integrated with the application's dependency injection container.

## Core Concepts

### Entities

Entities are classes that represent your database tables. They are the foundation of the ORM.

- Extend `Entity` to get a default `id` primary key and standard metadata fields (`revision`, `createTimestamp`, `deleteTimestamp`, etc.).
- Extend `EntityWithoutMetadata` for simpler tables (e.g., join tables) that only require an `id`.
- Use decorators to define columns, constraints, and relationships.

```typescript
import { Entity } from '@tstdl/base/orm';
import { StringProperty } from '@tstdl/base/schema';

// An entity with standard metadata columns
export class User extends Entity {
  @StringProperty()
  name: string;
}

// A simpler entity without metadata
export class Tag extends EntityWithoutMetadata {
  @StringProperty()
  label: string;
}
```

### Decorators

Decorators map class properties to database columns and define constraints.

**Column Types:**
Column types are defined using decorators from the `@tstdl/base/schema` and `@tstdl/base/orm` modules.

- **`@StringProperty()`**: Maps to a `text` column.
- **`@Integer()`**, **`@NumberProperty()`**: Maps to `integer` or `double precision`.
- **`@BooleanProperty()`**: Maps to a `boolean` column.
- **`@Uuid()`**: A native `uuid` column.
- **`@Timestamp()`**: A Unix timestamp (milliseconds) stored as `timestamp with time zone`.
- **`@NumericDate()`**: A date stored as a number (`YYYYMMDD`) in a `date` column.
- **`@Enumeration(MyEnum)`**: Maps a TypeScript enum to a PostgreSQL enum type.
- **`@Json()`**: Maps a property to a `jsonb` column.
- **`@Encrypted()`**: Transparently encrypts the column data. The underlying database type is `bytea`.
- **`@Embedded(MyClass)`**: Inlines the properties of another class into the table, optionally with a column prefix.

**Table and Constraint Decorators:**

- **`@Table({ name: '...', schema: '...' })`**: (Class decorator) Sets the table name and schema. Defaults to a snake_case version of the class name.
- **`@PrimaryKey()`**: (Property decorator) Marks a property as the primary key.
- **`@Unique()`**: (Property decorator) Creates a unique constraint on a single column.
- **`@Unique(['prop1', 'prop2'])`**: (Class decorator) Creates a composite unique constraint.
- **`@Index()`**: (Property decorator) Creates an index on a single column.
- **`@Index(['prop1', 'prop2'])`**: (Class decorator) Creates a composite index.
- **`@References(() => OtherEntity)`**: (Property decorator) Creates a foreign key to the `id` of another entity.
- **`@ForeignKey(() => Target, ['thisCol'], ['targetCol'])`**: (Class decorator) Creates a composite foreign key.
- **`@Check('name', (table) => ...)`**: (Class decorator) Defines a custom SQL `CHECK` constraint.

### Repositories

Data access is handled through repositories, which are specialized services for a single entity. Create a repository by defining a class that extends `getRepository(MyEntity)`. This automatically provides it with all standard data access methods.

#### Simple Repository

For most cases the default repository implementation is sufficient.

```typescript
import { Singleton } from '@tstdl/base/injector';
import { injectRepository } from '@tstdl/base/orm/server';
import { User } from '../models/user.model';

@Singleton()
export class LoginService {
  readonly #userRepository = injectRepository(User);

  async login(email: string, password: string): Promise<User | null> {
    const user = await this.#userRepository.loadByQuery({ email });
    // ...
  }
}
```

#### Extending Repository

```typescript
import { Singleton } from '@tstdl/base/injector';
import { getRepository } from '@tstdl/base/orm/server';
import { User } from '../models/user.model';

@Singleton()
export class ExtendedUserRepository extends getRepository(User) {
  // You can add custom, more complex data access methods here.
}
```

You can then use the general `inject()` function to get an instance of the service.

### Querying

The ORM uses a type-safe, MongoDB-like query syntax. The query object is mapped to the entity's properties and converted to a SQL `WHERE` clause.

**Simple Equality:**

```typescript
const user = await userRepository.loadByQuery({ mail: 'test@example.com' });
```

**Comparison Operators:**

```typescript
import { currentTimestamp } from '@tstdl/base/utils';

const fiveMinutesAgo = currentTimestamp() - 5 * 60 * 1000;
const recentTasks = await taskRepository.loadManyByQuery({
  createdAt: { $gt: fiveMinutesAgo },
});
```

**Logical Operators (`$and`, `$or`):**

```typescript
const activeAdmins = await userRepository.loadManyByQuery({
  $and: [{ role: 'admin' }, { status: { $neq: 'inactive' } }],
});
```

Most cases can be simplified, as properties are ORd automatically.

````typescript
const activeAdmins = await userRepository.loadManyByQuery({
  role: 'admin',
  status: { $neq: 'inactive' }
});

**Supported Operators:** `$eq`, `$neq`, `$in`, `$nin`, `$lt`, `$lte`, `$gt`, `$gte`, `$and`, `$or`, `$nor`, `$not`, `$regex`.

### Transactions

The `Transactional` base class provides robust transaction management. Repositories automatically extend this class.

-   **`this.transaction(async (tx) => { ... })`**: The primary method. It starts a transaction, executes the callback, and automatically commits on success or rolls back on error.
-   **`this.withTransaction(tx)`**: Creates a new repository instance bound to an existing transaction, allowing you to pass the transaction between services.

### Schema Generation

The code-first approach integrates with `drizzle-kit` to automate database migrations.

1.  **Define Entities**: Write your entity classes with decorators.
2.  **Expose Schema**: Create a central file (e.g., `schemas.ts`) that exports all Drizzle tables using `databaseSchema.getTable(MyEntity)`.
3.  **Configure `drizzle-kit`**: Point your `drizzle.config.ts` to the schema file.
4.  **Generate Migration**: Run `drizzle-kit generate`. It will compare your code-defined schema with the database and create a new SQL migration file.
5.  **Apply Migration**: Use the `migrate` function from `@tstdl/base/orm/server` to apply pending migrations on application startup.

## Usage

### 1. Define an Entity

Here is a `DocumentType` entity demonstrating various decorators.

```typescript
import { Entity } from '@tstdl/base/orm';
import { Table, Unique, References } from '@tstdl/base/orm';
import { StringProperty } from '@tstdl/base/schema';
import { Uuid } from '@tstdl/base/orm';
import { DocumentCategory } from './document-category.model';

@Table({ name: 'type', schema: 'document_management' })
@Unique<DocumentType>(['tenantId', 'categoryId', 'label'])
export class DocumentType extends Entity {
  declare static readonly entityName: 'DocumentType';

  @Uuid({ nullable: true })
  tenantId: string | null;

  @Uuid()
  @References(() => DocumentCategory)
  categoryId: Uuid;

  @StringProperty()
  label: string;
}
````

### 2. Create a Repository

Create a singleton service that extends `getRepository` with your entity class.

```typescript
import { Singleton } from '@tstdl/base/injector';
import { getRepository } from '@tstdl/base/orm/server';
import { DocumentType } from '../models/document-type.model.js';

@Singleton()
export class DocumentTypeRepository extends getRepository(DocumentType) {
  // Custom repository methods can be added here
}
```

### 3. Use the Repository

Inject and use the repository in your services or controllers to perform CRUD operations.

```typescript
import { injectRepository } from '@tstdl/base/orm/server';
import { DocumentTypeRepository } from './repositories/document-type.repository.js';

// In a service or controller...
const documentTypeRepository = injectRepository(DocumentTypeRepository);

// Create
const newType = await documentTypeRepository.insert({
  tenantId: 'some-tenant-id',
  categoryId: 'some-category-id',
  label: 'Invoice',
});

// Read
const invoiceType = await documentTypeRepository.load(newType.id);
const allTypesForTenant = await documentTypeRepository.loadManyByQuery({
  tenantId: 'some-tenant-id',
});

// Update
await documentTypeRepository.update(newType.id, { label: 'Updated Invoice' });

// Delete (soft delete)
await documentTypeRepository.delete(newType.id);
```

### 4. Run a Transaction

Use `this.transaction()` to ensure multiple database operations are executed atomically.

```typescript
// Inside a service that extends Transactional, e.g., a DeviceService
async function replaceDevice(oldDeviceId: string, newDeviceNumber: string, date: number): Promise<Device> {
  const oldDevice = await this.deviceRepository.load(oldDeviceId);

  // All operations inside this block are atomic.
  return this.transaction(async (tx) => {
    // Get a repository instance bound to this transaction
    const deviceRepository = this.deviceRepository.withTransaction(tx);

    await deviceRepository.update(oldDevice.id, { removalDate: date });

    return deviceRepository.insert({
      tenantId: oldDevice.tenantId,
      type: oldDevice.type,
      deviceNumber: newDeviceNumber,
      // ... other properties
    });
  });
}
```

## API Summary

### Decorators

| Decorator                                                | Type             | Description                                                                       |
| -------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `@Table(options)`                                        | Class            | Specifies table name and schema.                                                  |
| `@PrimaryKey()`                                          | Property         | Marks a property as the primary key.                                              |
| `@Unique(columns?, options?)`                            | Class / Property | Defines a unique constraint.                                                      |
| `@Index(columns?, options?)`                             | Class / Property | Defines a database index.                                                         |
| `@Check(name, builder)`                                  | Class            | Defines a custom SQL `CHECK` constraint.                                          |
| `@ForeignKey(target, columns, foreignColumns, options?)` | Class            | Defines a composite foreign key relationship.                                     |
| `@References(target, targetColumn?)`                     | Property         | Defines a foreign key relationship to another entity's column (defaults to `id`). |
| `@Encrypted()`                                           | Property         | Marks a column for transparent encryption (stored as `bytea`).                    |
| `@Embedded(type, options?)`                              | Property         | Inlines properties from another class into the table.                             |
| `@Uuid(options?)`                                        | Property         | Defines a `uuid` column.                                                          |
| `@Timestamp(options?)`                                   | Property         | Defines a `timestamp with time zone` column, storing a number (milliseconds).     |
| `@NumericDate(options?)`                                 | Property         | Defines a `date` column, storing a number (`YYYYMMDD`).                           |
| `@Json(options?)`                                        | Property / Class | Defines a `jsonb` column.                                                         |

### EntityRepository Methods

| Method                             | Description                                                         |
| ---------------------------------- | ------------------------------------------------------------------- |
| `load(id)`                         | Loads a single entity by ID. Throws if not found.                   |
| `tryLoad(id)`                      | Loads a single entity by ID. Returns `undefined` if not found.      |
| `loadByQuery(query, options?)`     | Loads the first entity matching the query. Throws if not found.     |
| `loadManyByQuery(query, options?)` | Loads all entities matching the query.                              |
| `insert(entity)`                   | Inserts a new entity.                                               |
| `insertMany(entities)`             | Inserts multiple new entities.                                      |
| `upsert(target, entity, update?)`  | Inserts an entity or updates it on conflict.                        |
| `update(id, update)`               | Updates an entity by its ID.                                        |
| `updateByQuery(query, update)`     | Updates the first entity matching a query.                          |
| `updateManyByQuery(query, update)` | Updates all entities matching a query.                              |
| `delete(id)`                       | Soft-deletes an entity by its ID (if it has metadata).              |
| `hardDelete(id)`                   | Permanently deletes an entity by its ID.                            |
| `countByQuery(query)`              | Counts entities matching a query.                                   |
| `hasByQuery(query)`                | Checks if any entity matches a query.                               |
| `withTransaction(tx)`              | Returns a new repository instance bound to a specific transaction.  |
| `transaction(handler)`             | Executes a handler within a new, automatically managed transaction. |
