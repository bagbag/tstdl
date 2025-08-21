# @tstdl/base/enumeration

A lightweight utility for creating and registering named, type-safe enumerations in TypeScript.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Defining an Enum](#defining-an-enum)
  - [Retrieving an Enum's Name](#retrieving-an-enums-name)
- [API Summary](#api-summary)

## Features

- **Named Enums:** Associate a string name with an enum-like object, retrievable at runtime.
- **Type-Safe:** Leverages TypeScript's `const` generics to create precise, type-safe union types from plain objects.
- **Lightweight:** A minimal implementation with zero external dependencies.
- **Memory-Efficient:** Uses a `WeakMap` to store enum names, allowing for automatic garbage collection if the enum object is no longer referenced.

## Core Concepts

Native TypeScript `enum`s have limitations, especially for framework development. Their declared name is lost at compile time, and they have complex runtime behavior (e.g., reverse mappings for numeric enums). This makes it difficult for systems like ORMs, serializers, or validators to identify an enum type by a consistent name.

This module provides a simple and robust alternative. The `defineEnum` function allows you to use a standard JavaScript object as an enum. It registers the object with a unique string name in a global, memory-safe registry (`WeakMap`). This name can be retrieved at runtime using `getEnumName`, enabling powerful metaprogramming scenarios where you need to reference the enum's "type" by name.

This approach provides the benefits of an enum—grouping related constants—with the predictability of plain objects and the added advantage of a retrievable runtime name.

## Usage

### Defining an Enum

Use the `defineEnum` function to create your enumeration object and register its name. The function automatically infers the most specific types for your enum values. The `EnumType` utility can then be used to create a corresponding TypeScript type for the enum values.

```typescript
import { defineEnum, type EnumType } from '@tstdl/base/enumeration';

// 1. Define the enum object and register its name.
export const OrderStatus = defineEnum('OrderStatus', {
  Pending: 'pending',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
});

// 2. Create a type alias for the enum values.
export type OrderStatus = EnumType<typeof OrderStatus>;

// 3. Use the enum and its type in your code.
function processOrder(status: OrderStatus): void {
  console.log(`Processing order with status: ${status}`);
}

processOrder(OrderStatus.Processing); // OK
// processOrder('processing'); // OK, as OrderStatus is a union of string literals
// processOrder('unknown'); // Error: Argument of type '"unknown"' is not assignable...
```

### Retrieving an Enum's Name

You can retrieve the registered name of an enum object, which is useful for metaprogramming, serialization, or logging.

```typescript
import { defineEnum, getEnumName, tryGetEnumName } from '@tstdl/base/enumeration';

const UserRole = defineEnum('UserRole', {
  Admin: 'admin',
  Editor: 'editor',
  Viewer: 'viewer',
});

const unregisteredEnum = { a: 1 };

// Get the name; throws an error if the enum is not registered
try {
  const name = getEnumName(UserRole);
  console.log(name); // "UserRole"

  getEnumName(unregisteredEnum); // Throws an error
} catch (error) {
  console.error((error as Error).message); // "Unknown enumeration"
}

// Safely get the name; returns undefined if not found
const safeName = tryGetEnumName(UserRole);
const unknownName = tryGetEnumName(unregisteredEnum);

console.log(safeName); // "UserRole"
console.log(unknownName); // undefined
```

## API Summary

| Member | Signature | Description |
|---|---|---|
| `defineEnum()` | `function defineEnum<const T extends object>(name: string, enumObject: T): T` | Registers an `enumObject` with a given `name` and returns it. The `<const T>` generic ensures that the returned type is inferred as a set of literal types, providing strong type safety. |
| `getEnumName()` | `function getEnumName(enumeration: object): string` | Retrieves the registered name for an enum object. Throws an `Error` if the enum is not registered. |
| `tryGetEnumName()` | `function tryGetEnumName(enumeration: object): string \| undefined` | Safely retrieves the registered name for an enum object. Returns `undefined` if not registered. |
| `EnumType` | `type EnumType<T extends object> = T[keyof T]` | A utility type that creates a union type from an enum-like object's values. |
