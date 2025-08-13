# @tstdl/schema

A powerful, TypeScript-first schema declaration, validation, and parsing library with deep integration into classes via decorators. Define data structures once and get static type safety, runtime validation, and serialization for free.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Standalone Schemas](#standalone-schemas)
  - [Class-based Schemas](#class-based-schemas)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic Validation](#basic-validation)
  - [Class-based Schemas with Decorators](#class-based-schemas-with-decorators)
  - [Type Coercion](#type-coercion)
- [API Reference](#api-reference)
  - [Schema Builders](#schema-builders)
  - [Object Utilities](#object-utilities)
  - [Decorators](#decorators)
  - [Converters](#converters)
- [OpenAPI Generation](#openapi-generation)

## Features

- **Type Safety**: Automatically infers TypeScript types from your schemas.
- **Fluent API**: A simple and chainable API for building complex schemas.
- **Decorator-Based**: Define schemas directly from your classes, reducing boilerplate and keeping your models as the single source of truth.
- **Runtime Validation**: Robust validation for any data, from API responses to user input.
- **Type Coercion**: Optional coercion of data to the correct types (e.g., string to number).
- **Detailed Error Reporting**: Get precise error messages with JSON paths to invalid data.
- **Extensible**: Easily create custom schemas and transformations.
- **Method & Function Schemas**: Define schemas for function parameters and return types.
- **OpenAPI Generation**: Convert schemas to OpenAPI v3 schema objects.

## Core Concepts

The library supports two primary ways of defining schemas, which can be used interchangeably.

### Standalone Schemas
Use builder functions (`object`, `string`, `array`, etc.) to create schema definitions. This approach is great for defining data shapes that don't have a corresponding class, such as API payloads or configuration objects.

```typescript
const userSchema = object({
  id: string(),
  name: string(),
  age: number({ minimum: 0 }),
});
```

### Class-based Schemas
Use decorators (`@Class`, `@Property`, etc.) to derive schemas directly from your TypeScript classes. This turns your classes into the single source of truth for both type information and validation logic, eliminating redundant definitions. This requires `experimentalDecorators` and `emitDecoratorMetadata` to be enabled in `tsconfig.json`.

```typescript
@Class()
class User {
  @StringProperty()
  id: string;

  @StringProperty()
  name: string;

  @NumberProperty({ minimum: 0 })
  age: number;
}
```

## Installation

```bash
npm install @tstdl/schema
```

You also need to enable decorator-related flags in your `tsconfig.json` to use class-based schemas:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Usage

### Basic Validation

The core of the library is the `Schema` class and its static methods. You can define a schema, then use `Schema.parse()` to validate and parse data. If the data is invalid, it will throw a `SchemaError`.

```typescript
import { Schema, object, string, number, SchemaError } from '@tstdl/schema';

const userSchema = object({
  id: string(),
  name: string(),
  age: number({ minimum: 0 }),
});

// Valid data
const validUser = {
  id: 'user-123',
  name: 'John Doe',
  age: 30,
};

try {
  const parsedUser = Schema.parse(userSchema, validUser);
  console.log('Validation successful:', parsedUser);
  // parsedUser is fully typed as { id: string; name: string; age: number; }
} catch (e) {
  // This block will not be reached
}

// Invalid data
const invalidUser = {
  id: 'user-123',
  name: 'Jane Doe',
  age: -5, // Invalid age
};

try {
  Schema.parse(userSchema, invalidUser);
} catch (e) {
  if (e instanceof SchemaError) {
    console.error('Validation failed!');
    console.error(e.message); // -> /age: Value must be more than or equal to 0.
    console.error(e.path); // -> /age
  }
}
```

### Class-based Schemas with Decorators

This powerful feature lets you derive schemas directly from your classes.

```typescript
import { Schema, Class, StringProperty, NumberProperty, Property } from '@tstdl/schema';

// Define a schema for a nested object
@Class()
class Address {
  @StringProperty()
  street: string;

  @StringProperty()
  city: string;
}

// Define the main User schema
@Class()
class User {
  @StringProperty()
  id: string;

  @StringProperty({ nullable: true })
  firstName: string | null;

  @StringProperty()
  lastName: string;

  @NumberProperty({ minimum: 18, integer: true })
  age: number;

  @Property(Address) // Use the Address class as a schema for the nested object
  address: Address;
}

// Use the User class directly as a schema
const userData = {
  id: 'usr-42',
  lastName: 'Doe',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'Anytown',
  },
};

const user = Schema.parse(User, userData);

console.log(user instanceof User); // true
console.log(user.address instanceof Address); // true
console.log(user.firstName); // undefined (as it's nullable and was not provided)
```

### Type Coercion

The library can automatically convert types during parsing if you enable coercion. This is useful for handling data from sources like query parameters or form data, which are often strings.

```typescript
import { Schema, number } from '@tstdl/schema';

const schema = number();

// Without coercion, this will fail
try {
  Schema.parse(schema, '123');
} catch (e) {
  if (e instanceof SchemaError) {
    console.log(e.message); // -> /: Expected number but got string.
  }
}

// With coercion, it works
const value = Schema.parse(schema, '123', { coerce: true });
console.log(value); // 123 (as a number)
```

## API Reference

### Schema Builders

A brief overview of the available schema builder functions.

#### Primitives
- `string(options?)`: For strings. Options include `pattern`.
- `number(options?)`: For numbers. Options include `minimum`, `maximum`.
- `integer(options?)`: A shorthand for `number({ integer: true, ... })`.
- `boolean(options?)`: For booleans.
- `bigint(options?)`: For bigints.
- `date(options?)`: For `Date` objects.
- `symbol()`: For symbols.
- `literal(value)`: For an exact primitive value (e.g., `literal('success')`).
- `enumeration(enum)`: For a TypeScript enum, or an array of literal values.

#### Structures
- `object(properties, options?)`: For objects with a known set of properties.
- `array(itemSchema, options?)`: For arrays where all elements match `itemSchema`.
- `union(...schemas)`: For values that can match one of several schemas.
- `record(keySchema, valueSchema)`: For objects with arbitrary keys (like a dictionary).
- `oneOrMany(schema)`: For a value that can be a single item or an array of items.

#### Modifiers
- `optional(schema)`: Makes a value optional (allows `undefined`).
- `nullable(schema)`: Makes a value nullable (allows `null`).
- `defaulted(schema, defaultValue)`: Provides a default value if the input is `null` or `undefined`.
- `transform(schema, transformFn)`: Transforms a valid value after parsing.

#### Special Types
- `any()`: Allows any value (unsafe, use with caution).
- `unknown()`: A safer alternative to `any()`.
- `never()`: Allows no values.
- `instance(Constructor)`: Validates that a value is an instance of a specific class.
- `deferred(() => schema)`: For defining recursive schemas.
- `uint8Array()`: For `Uint8Array` instances.
- `readableStream()`: For `ReadableStream` instances.
- `regexp()`: For `RegExp` instances.
- `func(paramSchemas, returnSchema)`: For functions.

### Object Utilities

- `assign(...schemas)`: Merges multiple object schemas into one.
- `pick(schema, keys)`: Creates a new object schema with only the specified keys from the original.
- `omit(schema, keys)`: Creates a new object schema without the specified keys from the original.
- `partial(schema, keys?)`: Makes all (or just the specified) properties of an object schema optional.

### Decorators

- `@Class(options?)`: Marks a class as a schema source.
- `@Property(schema?, options?)`: Marks a property to be included in the class schema. The type is often inferred, but can be provided explicitly for complex types or arrays.
- `@StringProperty`, `@NumberProperty`, `@BooleanProperty`, `@Enumeration`, etc.: Shortcuts for `@Property` with a primitive schema.

### Converters

- `convertToOpenApiSchema(schema)`: Converts a schema into an OpenAPI v3 compatible schema object.

## OpenAPI Generation

You can generate OpenAPI v3 compatible schemas from your schema definitions, which is invaluable for documenting your APIs.

```typescript
import { convertToOpenApiSchema } from '@tstdl/schema/converters';
import { object, string, number, enumeration, optional } from '@tstdl/schema';

enum Role {
  Admin = 'ADMIN',
  User = 'USER',
}

const userSchema = object({
  id: string({ description: 'The user ID' }),
  username: string(),
  role: enumeration(Role),
  age: optional(number({ minimum: 18 })),
});

const openApiSchema = convertToOpenApiSchema(userSchema);

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
      "description": "The user ID"
    },
    "username": {
      "type": "string",
      "nullable": false
    },
    "role": {
      "type": "string",
      "format": "enum",
      "enum": [
        "ADMIN",
        "USER"
      ],
      "nullable": false
    },
    "age": {
      "type": "number",
      "minimum": 18,
      "nullable": false
    }
  },
  "required": [
    "id",
    "username",
    "role"
  ],
  "nullable": false
}
```