# @tstdl/base/schema

A powerful, TypeScript-first schema declaration and validation library. Define data structures once with builder functions or class decorators and get static types, runtime validation, and serialization for free.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Standalone Schemas (Builder Functions)](#standalone-schemas-builder-functions)
  - [Class-based Schemas (Decorators)](#class-based-schemas-decorators)
- [Usage](#usage)
  - [Standalone Schemas & Validation](#standalone-schemas--validation)
  - [Class-based Schemas](#class-based-schemas)
  - [Type Coercion](#type-coercion)
  - [Object Utilities](#object-utilities)
  - [Recursive Schemas](#recursive-schemas)
  - [OpenAPI Generation](#openapi-generation)
- [API Summary](#api-summary)
  - [Static Schema Methods](#static-schema-methods)
  - [Schema Builders](#schema-builders)
  - [Object Utilities](#object-utilities)
  - [Decorators](#decorators)
  - [Converters](#converters)

## Features

- **Type Safety**: Automatically infers TypeScript types directly from your schemas.
- **Fluent API**: A simple and composable API for building complex schemas from primitives.
- **Decorator-Based**: Define schemas directly on your classes, making your models the single source of truth.
- **Runtime Validation**: Robust validation for any data, from API responses to user input.
- **Type Coercion**: Optional coercion of data to the correct types (e.g., string to number).
- **Detailed Error Reporting**: Get precise error messages with JSON paths to pinpoint invalid data.
- **Extensible**: Easily create custom schemas and transformations.
- **Function & Method Schemas**: Define schemas for function parameters and return types.
- **OpenAPI Generation**: Convert schemas to OpenAPI v3 schema objects for API documentation.

## Core Concepts

The library supports two complementary ways of defining schemas, which can be used interchangeably.

### Standalone Schemas (Builder Functions)

Use builder functions (`object`, `string`, `array`, etc.) to compose schema definitions. This approach is ideal for defining data shapes that don't have a corresponding class, such as API payloads, configuration objects, or function arguments.

```typescript
import { object, string, number, array } from '@tstdl/base/schema';

const productSchema = object({
  id: string(),
  name: string(),
  price: number({ minimum: 0 }),
  tags: array(string()),
});

// The inferred type is:
// type Product = {
//   id: string;
//   name: string;
//   price: number;
//   tags: string[];
// }
```

### Class-based Schemas (Decorators)

Use decorators (`@Class`, `@Property`, etc.) to derive schemas directly from your TypeScript classes. This turns your classes into the single source of truth for both static type information and runtime validation logic, eliminating redundant definitions and strengthening the link between your runtime models and their validation rules.

```typescript
import { Class, StringProperty, NumberProperty } from '@tstdl/base/schema';

@Class()
class User {
  @StringProperty()
  id: string;

  @StringProperty()
  name: string;

  @NumberProperty({ minimum: 0, integer: true })
  age: number;
}
```

## Usage

### Standalone Schemas & Validation

The `Schema` class provides static methods for validation. `Schema.parse()` returns a typed value or throws a `SchemaError`, while `Schema.validate()` returns a boolean.

```typescript
import { Schema, object, string, number, array, optional, nullable, SchemaError } from '@tstdl/base/schema';

const addressSchema = object({
  street: string(),
  city: string(),
});

const userSchema = object({
  id: string({ pattern: /^usr_/ }),
  name: string(),
  age: number({ minimum: 18 }),
  email: optional(string()),
  profile: nullable(object({ bio: string() })),
  addresses: array(addressSchema),
});

// --- Valid Data ---
const validUser = {
  id: 'usr_123',
  name: 'Jane Doe',
  age: 30,
  profile: null,
  addresses: [{ street: '123 Main St', city: 'Anytown' }],
};

// `parse` returns the typed value or throws an error on failure.
const parsedUser = Schema.parse(userSchema, validUser);
console.log(parsedUser.name); // 'Jane Doe'

// `validate` returns a boolean.
console.log(Schema.validate(userSchema, validUser)); // true

// --- Invalid Data ---
const invalidUser = { id: 'usr_456', name: 'John Doe', age: 17, addresses: [] };

try {
  Schema.parse(userSchema, invalidUser);
}
catch (e) {
  if (e instanceof SchemaError) {
    console.error(e.message); // -> /age: Value must be more than or equal to 18.
  }
}

// `assert` is a type guard that throws on failure.
try {
  Schema.assert(userSchema, invalidUser);
  // this line will not be reached
}
catch (e) {
  console.error('Assertion failed.');
}
```

### Class-based Schemas

Decorators allow you to derive schemas directly from your classes. The class itself becomes a valid `SchemaTestable`. This approach requires `experimentalDecorators` and `emitDecoratorMetadata` to be enabled in your `tsconfig.json`.

```typescript
import { Schema, Class, Property, StringProperty, NumberProperty, Array } from '@tstdl/base/schema';

// Note: To use decorators, you must enable `experimentalDecorators` and
// `emitDecoratorMetadata` in your tsconfig.json.

@Class()
class Pet {
  @StringProperty()
  name: string;

  @StringProperty()
  species: string;
}

@Class()
class User {
  @StringProperty()
  id: string;

  @StringProperty()
  name: string;

  @NumberProperty({ minimum: 0, integer: true })
  age: number;

  @Array(Pet) // Use the Pet class as a schema for items in the array
  pets: Pet[];
}

const userData = {
  id: 'user-1',
  name: 'John Doe',
  age: 42,
  pets: [{ name: 'Fido', species: 'Dog' }],
};

// The User class itself is a valid schema
const user = Schema.parse(User, userData);

console.log(user instanceof User); // true
console.log(user.pets[0] instanceof Pet); // true
console.log(user.name); // 'John Doe'
```

### Type Coercion

The library can automatically convert types during parsing by enabling the `coerce` option. This is useful for handling data from sources like query parameters or form data where values are often strings.

```typescript
import { Schema, object, number, boolean } from '@tstdl/base/schema';

const settingsSchema = object({
  port: number({ integer: true }),
  isProduction: boolean(),
});

const rawSettings = {
  port: '8080',       // string instead of number
  isProduction: '1',  // string '1' instead of boolean
};

// With coercion enabled, the strings are converted to the correct types.
const settings = Schema.parse(settingsSchema, rawSettings, { coerce: true });

console.log(settings); // { port: 8080, isProduction: true }
console.log(typeof settings.port); // 'number'
```

### Object Utilities

Compose and transform object schemas with powerful utility functions.

```typescript
import { Schema, object, string, number, pick, omit, partial, assign } from '@tstdl/base/schema';

const baseUserSchema = object({
  id: string(),
  name: string(),
  email: string(),
  age: number(),
});

// `pick` creates a schema with only the specified properties.
const userPreviewSchema = pick(baseUserSchema, ['name', 'age']);
// type: { name: string; age: number; }

// `omit` creates a schema without the specified properties.
const userCreationSchema = omit(baseUserSchema, ['id']);
// type: { name: string; email: string; age: number; }

// `partial` makes all properties optional.
const userUpdateSchema = partial(baseUserSchema);
// type: { id?: string; name?: string; email?: string; age?: number; }

// `assign` merges multiple schemas.
const auditedUserSchema = assign(baseUserSchema, object({ createdAt: number() }));
// type: { id: string; name: string; email: string; age: number; createdAt: number; }
```

### Recursive Schemas

Use `deferred` to define schemas that reference themselves, perfect for tree-like data structures.

```typescript
import { Schema, object, string, array, optional, deferred } from '@tstdl/base/schema';

// Define a self-referencing schema for a category tree
const categorySchema = object({
  name: string(),
  children: optional(array(deferred(() => categorySchema))),
});

const data = {
  name: 'Electronics',
  children: [
    { name: 'Phones' },
    {
      name: 'Computers',
      children: [{ name: 'Laptops' }, { name: 'Desktops' }],
    },
  ],
};

const category = Schema.parse(categorySchema, data);
console.log(category.children?.[1].name); // 'Computers'
```

### OpenAPI Generation

Generate OpenAPI v3 compatible schemas from your schema definitions, which is invaluable for documenting your APIs.

```typescript
import { convertToOpenApiSchema } from '@tstdl/base/schema/converters';
import { object, string, integer, enumeration, optional } from '@tstdl/base/schema';

enum PetStatus {
  Available = 'available',
  Pending = 'pending',
  Sold = 'sold',
}

const petSchema = object({
  id: string({ description: 'The pet ID' }),
  name: string(),
  status: enumeration(PetStatus),
  age: optional(integer({ minimum: 0 })),
});

const openApiSchema = convertToOpenApiSchema(petSchema);
console.log(JSON.stringify(openApiSchema, null, 2));
```

**Output:**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "nullable": false,
      "description": "The pet ID"
    },
    "name": {
      "type": "string",
      "nullable": false
    },
    "status": {
      "type": "string",
      "format": "enum",
      "enum": [
        "available",
        "pending",
        "sold"
      ],
      "nullable": false
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "nullable": false
    }
  },
  "required": [
    "id",
    "name",
    "status"
  ],
  "nullable": false
}
```

## API Summary

### Static Schema Methods

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `Schema.parse(schema, value, options?)` | `schema: SchemaTestable<T>`, `value: any`, `options?: SchemaTestOptions` | `T` | Parses a value against a schema. Throws `SchemaError` on failure. |
| `Schema.validate(schema, value, options?)` | `schema: SchemaTestable<T>`, `value: any`, `options?: SchemaTestOptions` | `boolean` | Validates a value against a schema. Returns `true` or `false`. |
| `Schema.assert(schema, value, options?)` | `schema: SchemaTestable<T>`, `value: any`, `options?: SchemaTestOptions` | `void` | Asserts that a value conforms to a schema. Throws `SchemaError` on failure. |
| `Schema.test(schema, value, options?)` | `schema: SchemaTestable<T>`, `value: any`, `options?: SchemaTestOptions` | `SchemaTestResult<T>` | Tests a value against a schema. Returns a result object with value or error. |

### Schema Builders

| Builder | Description |
| :--- | :--- |
| `string(options?)` | Creates a schema for `string` values. |
| `number(options?)` | Creates a schema for `number` values. |
| `integer(options?)` | Shorthand for a `number` schema with `integer: true`. |
| `boolean(options?)` | Creates a schema for `boolean` values. |
| `bigint(options?)` | Creates a schema for `bigint` values. |
| `date(options?)` | Creates a schema for `Date` objects. |
| `symbol()` | Creates a schema for `symbol` values. |
| `literal(value)` | Creates a schema for an exact primitive value (e.g., `literal('success')`). |
| `enumeration(enum)` | Creates a schema for a TypeScript `enum` or an array of literal values. |
| `object(properties, options?)` | Creates a schema for objects with a defined set of properties. |
| `array(itemSchema, options?)` | Creates a schema for arrays where all elements match a given schema. |
| `union(...schemas)` | Creates a schema for values that can match one of several schemas. |
| `oneOrMany(schema)` | Creates a schema for a value that is either a single item or an array of items. |
| `record(keySchema, valueSchema)` | Creates a schema for objects with arbitrary keys (like a dictionary). |
| `optional(schema)` | Modifies a schema to allow `undefined` values. |
| `nullable(schema)` | Modifies a schema to allow `null` values. |
| `defaulted(schema, defaultValue)` | Provides a default value if the input is `null` or `undefined`. |
| `transform(schema, transformFn)` | Transforms a valid value after parsing. |
| `deferred(() => schema)` | Allows for the definition of recursive schemas. |
| `instance(Constructor)` | Validates that a value is an instance of a specific class. |
| `any()` | Allows any value (unsafe, use with caution). |
| `unknown()` | A safer alternative to `any()`, allows any value but requires type checking. |
| `never()` | A schema that allows no values. |
| `func(...)` | Creates a schema for a `function`. |
| `uint8Array()` | Creates a schema for `Uint8Array` instances. |
| `readableStream()` | Creates a schema for `ReadableStream` instances. |
| `regexp()` | Creates a schema for `RegExp` instances. |

### Object Utilities

| Utility | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `assign(...schemas)` | `...schemas: ObjectSchemaOrType[]` | `ObjectSchema` | Merges multiple object schemas into a single new schema. |
| `pick(schema, keys)` | `schema: ObjectSchemaOrType`, `keys: OneOrMany<keyof T>` | `ObjectSchema` | Creates a new schema with only the specified properties from the original. |
| `omit(schema, keys)` | `schema: ObjectSchemaOrType`, `keys: OneOrMany<keyof T>` | `ObjectSchema` | Creates a new schema without the specified properties. |
| `partial(schema, keys?)` | `schema: ObjectSchemaOrType`, `keys?: OneOrMany<keyof T>` | `ObjectSchema` | Makes all (or specified) properties of an object schema optional. |

### Decorators

| Decorator | Target | Description |
| :--- | :--- | :--- |
| `@Class(options?)` | `class` | Marks a class as a schema source, enabling schema generation from its properties. |
| `@Property(schema?, options?)` | `property` | Marks a property to be included in the class schema. Type is often inferred. |
| `@StringProperty(options?)` | `property` | Shortcut for `@Property(string(options))`. |
| `@NumberProperty(options?)` | `property` | Shortcut for `@Property(number(options))`. |
| `@Integer(options?)` | `property` | Shortcut for `@Property(integer(options))`. |
| `@BooleanProperty(options?)` | `property` | Shortcut for `@Property(boolean(options))`. |
| `@DateProperty(options?)` | `property` | Shortcut for `@Property(date(options))`. |
| `@Enumeration(enum, options?)` | `property` | Shortcut for `@Property(enumeration(enum, options))`. |
| `@Array(schema, options?)` | `property` | Shortcut for `@Property(array(schema, options))`. |
| `@Method(...)` | `method` | Defines a schema for a class method, including its parameters and return type. |
| `@Parameter(...)` | `parameter` | Defines a schema and name for a specific method parameter. |

### Converters

| Function | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `convertToOpenApiSchema(schema)` | `schema: SchemaTestable` | `object` | Converts a schema into an OpenAPI v3 compatible schema object. |
