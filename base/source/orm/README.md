# ORM Module Developer Guide

This document provides a guide for developers working with the custom ORM module. This module is a powerful, code-first, decorator-based abstraction layer built on top of [Drizzle ORM](https://orm.drizzle.team/), designed to simplify data access and management in a type-safe manner for a PostgreSQL database.

## Key Features

- **Code-First Approach**: Define your database schema directly in your TypeScript entity classes using decorators.
- **Repository Pattern**: A clean, consistent API for all CRUD (Create, Read, Update, Delete) operations.
- **Type-Safe Querying**: A MongoDB-like query syntax that is fully typed based on your entity models.
- **Built-in Transactions**: Simple and robust transaction management to ensure data integrity.
- **Transparent Encryption**: Encrypt sensitive data at the column level with a single decorator.
- **Dependency Injection**: Seamlessly integrated with the application's dependency injection container.

## Core Concepts

### 1. Defining Entities

Entities are the cornerstone of the ORM. They are simple classes that represent your database tables.

- Extend `Entity` to get a default `id` primary key and metadata fields (`revision`, `createTimestamp`, etc.).
- Extend `EntityWithoutMetadata` for simpler tables (e.g., join tables) that only need an `id`.
- Use decorators to define columns, constraints, and relationships.

**Example: A simplified `User` entity**

```typescript
// From: source/shared/models/core/user.model.ts

import { Entity, Unique, Uuid } from '@tstdl/base/orm';
import { Enumeration, StringProperty } from '@tstdl/base/schema';
import { Gender } from './gender.model';
import { mailPattern } from '@tstdl/base/utils';

export class User extends Entity {
  @StringProperty({ nullable: true })
  firstName: string | null;

  @StringProperty()
  lastName: string;

  @StringProperty({ pattern: mailPattern })
  @Unique() // Defines a unique constraint on this column
  mail: string;

  @Enumeration(Gender, { nullable: true })
  gender: Gender | null;
}
```

### 2. Schema Definition with Decorators

Decorators are used to map class properties to database columns and define constraints.

#### Column Types & Properties

- **`@Uuid()`**: A UUID primary key. `PrimaryKey()` is often used with it.
- **`@StringProperty()`**: Maps to a `text` column.
- **`@NumberProperty()`**, **`@Integer()`**: Maps to `double precision` or `integer`.
- **`@BooleanProperty()`**: Maps to a `boolean` column.
- **`@Timestamp()`**: A Unix timestamp (milliseconds) stored as `timestamp with time zone`.
- **`@NumericDate()`**: A date stored as a number (`YYYYMMDD`) in a `date` column.
- **`@Enumeration(MyEnum)`**: Maps a TypeScript enum to a PostgreSQL enum type.
- **`@Encrypted()`**: Transparently encrypts the column data in the database using AES-GCM. The underlying column type is `bytea`.
- **`@Embedded(MyClass)`**: Inlines the properties of another class (a value object) into the table, optionally with a column prefix.

**Example: `@Embedded` for properties**

```typescript
// From: source/shared/models/core/gateway.model.ts
import { Embedded, Timestamp, Uuid } from '@tstdl/base/orm';
import { NumberProperty, StringProperty } from '@tstdl/base/schema';
import { TenantEntity } from './entity.model';

// Define a reusable property group
export class GatewayFloatProperty {
  @Timestamp({ nullable: true })
  timestamp: number | null;

  @NumberProperty({ nullable: true })
  value: number | null;
}

export class GatewayProperties {
  @Embedded(GatewayFloatProperty)
  rsrp: Embedded<GatewayFloatProperty>;

  @Embedded(GatewayFloatProperty)
  rsrq: Embedded<GatewayFloatProperty>;
  // ... other properties
}

export class Gateway extends TenantEntity {
  @Uuid()
  id: string;

  // ... other columns

  @Embedded(GatewayProperties)
  properties: Embedded<GatewayProperties>;
}
```

#### Constraints and Relationships

- **`@Table('table_name', { schema: 'my_schema' })`**: (Class decorator) Sets the table name and schema. Defaults to a snake_case version of the class name.
- **`@PrimaryKey()`**: Marks a property as the primary key. For composite keys, use `@Table` with a `primaryKey` option.
- **`@Unique()`**: (Property decorator) Creates a unique constraint on a single column.
- **`@Unique(['prop1', 'prop2'])`**: (Class decorator) Creates a composite unique constraint.
- **`@Index()`**: (Property decorator) Creates an index on a single column.
- **`@Index(['prop1', 'prop2'])`**: (Class decorator) Creates a composite index.
- **`@References(() => OtherEntity)`**: Creates a foreign key relationship to the `id` of another entity.
- **`@Check('constraint_name', (table) => ...)`**: (Class decorator) Defines a custom SQL check constraint.

**Example: A `Device` entity with constraints**

```typescript
// From: source/shared/models/core/device.model.ts
import { Check, Index, References, Unique, Uuid, numNonNulls } from '@tstdl/base/orm';
import { Enumeration, StringProperty } from '@tstdl/base/schema';
import { eq, sql } from 'drizzle-orm';
import { TenantEntity, RealEstate, Building, Unit, DeviceType, RoomType } from './models';

@Unique<Device>(['realEstateId', 'deviceNumber'])
@Check<Device>('building_or_unit', (table) => eq(numNonNulls(table.buildingId, table.unitId), sql.raw('1')))
export class Device extends TenantEntity {
  @Enumeration(DeviceType)
  @Index()
  type: DeviceType;

  @StringProperty()
  deviceNumber: string;

  @Uuid()
  @References(() => RealEstate)
  realEstateId: Uuid;

  @Uuid({ nullable: true })
  @References(() => Building)
  buildingId: Uuid | null;

  @Uuid({ nullable: true })
  @References(() => Unit)
  unitId: Uuid | null;

  @Enumeration(RoomType)
  roomType: RoomType;
}
```

### 3. The Repository Pattern

Data access is handled through repositories, which are specialized services for a single entity.

#### Creating a Repository

Create a service class that extends `getRepository(MyEntity)`. This automatically provides it with all standard data access methods.

```typescript
// From: source/services/core/user.service.ts
import { Singleton } from '@tstdl/base/injector';
import { getRepository } from '@tstdl/base/orm/server';
import { User } from '../models/user.model';

@Singleton()
export class UserService extends getRepository(User) {
  // You can add custom, more complex data access methods here.
}
```

#### Using a Repository

Inject your repository using `injectRepository` or `injectAsync` where needed.

```typescript
// From: source/bootstrap-data.ts
import { injectRepository } from '@tstdl/base/orm/server';
import { SuperUser } from './models/super-user.model';

class Context {
  readonly superUserService = injectRepository(SuperUser);
  // ...
}
```

#### Core Repository Methods

- `load(id)`: Get one entity by ID. Throws if not found.
- `tryLoad(id)`: Get one entity by ID. Returns `undefined` if not found.
- `loadByQuery(query)`: Get the first entity matching the query. Throws if not found.
- `loadMany(ids)` / `loadManyByQuery(query)`: Get all entities matching the criteria.
- `insert(newEntity)` / `insertMany(newEntities)`: Create one or more new entities.
- `update(id, update)` / `updateMany(ids, update)`: Update entities by ID.
- `updateByQuery(query, update)`: Update entities matching a query.
- `delete(id)` / `deleteByQuery(query)`: Soft-delete entities.
- `hardDelete(id)` / `hardDeleteByQuery(query)`: Permanently delete entities.
- `upsert(target, entity, update)`: Insert an entity or update it if a conflict on the `target` column(s) occurs.
- `count()` / `countByQuery(query)`: Count entities.
- `has(id)` / `hasByQuery(query)`: Check for existence.

### 4. Querying Data

The ORM uses a type-safe, MongoDB-like query syntax. The query object is mapped to the entity's properties.

**Simple Equality:**

```typescript
// Find a user by email
const user = await userService.loadByQuery({ mail: 'test@example.com' });
```

**Comparison Operators:**

```typescript
// Find all gateways with a stale installation lease
const staleLeases = await leaseRepository.loadManyByQuery({
  timestamp: { $lt: currentTimestamp() - staleInstallationLeaseDelay },
});
```

**Logical Operators (`$and`, `$or`, `$nor`):**

```typescript
// Find tenants by ID *and* by staff member ID
const tenants = await tenantService.loadManyByQuery({
  $and: [{ id: { $in: staffMemberTenantIds } }, { id: { $in: filter.ids } }],
});
```

**Supported Operators:** `$eq`, `$neq`, `$in`, `$nin`, `$lt`, `$lte`, `$gt`, `$gte`, `$and`, `$or`, `$nor`, `$not`, `$regex`.

### 5. Transactions

Transactions are essential for maintaining data integrity across multiple operations. The `Transactional` base class makes this easy.

- **`this.transaction(async (repository) => { ... })`**: The most common use case. It starts a transaction, provides a transaction-bound instance of the repository, and automatically commits or rolls back.
- **`this.withTransaction(tx)`**: Passes an existing transaction down to another repository/service to ensure all operations occur within the same transaction.

**Example: Atomic Device Replacement**

```typescript
// From: source/services/core/device.service.ts

async replace(parameters: ReplaceDeviceParameters): Promise<Device> {
  const oldDevice = await this.load(parameters.id);

  // All operations inside this block are atomic.
  return this.transaction(async (repository) => {
    // repository is a transaction-bound instance of DeviceService
    await repository.update(oldDevice.id, { removalDate: parameters.date });

    return repository.insert({
      tenantId: oldDevice.tenantId,
      type: oldDevice.type,
      deviceNumber: parameters.newDeviceNumber,
      // ... other properties
    });
  });
}
```

### 6. Database Schema Generation

The ORM's code-first approach integrates with `drizzle-kit` for generating database migrations.

1.  **Entity Classes**: You define your schema using decorators on entity classes.
2.  **Schema Converter**: A core utility reads the reflection metadata from your classes and generates Drizzle schema objects in memory.
3.  **Schema Entrypoint**: A central file (e.g., `src/schemas.ts`) gathers all entity classes and exposes the generated Drizzle tables.
4.  **Drizzle Config**: The `drizzle.config.ts` file points to this schema entrypoint.
5.  **Migration Generation**: Running `drizzle-kit generate` compares the generated schema with the database state and creates a SQL migration file.

This workflow ensures that your database schema is always in sync with your TypeScript code.
