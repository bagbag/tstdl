# @tstdl/base/enumeration

A lightweight utility for creating and registering named, type-safe enumerations in TypeScript.

This module provides a simple way to define enumerations from plain objects while associating them with a runtime-accessible name, which is useful for frameworks like ORMs, serializers, or validators.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [API Summary](#api-summary)

## Features

- **Named Enums:** Associate a string name with an enum-like object, retrievable at runtime.
- **Type-Safe:** Leverages TypeScript's type inference to provide strong type safety for enum members.
- **Lightweight:** A minimal implementation with no external dependencies.
- **Memory-Efficient:** Uses a `WeakMap` to store enum names, allowing for garbage collection if the enum object is no longer referenced.

## Core Concepts

In standard TypeScript, when you define an `enum`, its declared name (e.g., `enum Status { ... }`) is lost during compilation. The compiled output is just a JavaScript object. This makes it difficult for runtime systems, like an ORM or a validation library, to identify the enum "type" by name.

The `@tstdl/base/enumeration` module solves this by providing a `defineEnum` function. It takes an enum-like object and a string name, and stores this association in a global, memory-safe registry (`WeakMap`). This allows other parts of your application to retrieve the enum's registered name at runtime using `getEnumName` or `tryGetEnumName`.

This pattern is especially powerful for framework development, where you might need to generate database schemas, UI components, or validation rules based on an enum type identified by its name.

## Usage

### Defining an Enum

Use the `defineEnum` function to create your enumeration object and register its name. You can then use the `EnumType` utility to create a corresponding TypeScript type for the enum values.

```typescript
import { defineEnum, type EnumType } from '@tstdl/base/enumeration';

// 1. Define the enum object and register its name
export const DocumentApproval = defineEnum('DocumentApproval', {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
});

// 2. (Optional) Create a type alias for the enum values
export type DocumentApproval = EnumType<typeof DocumentApproval>;

// 3. Use the enum in your code
function setApprovalStatus(status: DocumentApproval): void {
  console.log(`Setting status to: ${status}`);
}

setApprovalStatus(DocumentApproval.Pending); // OK
// setApprovalStatus('pending'); // OK
// setApprovalStatus('unknown'); // Error: Argument of type '"unknown"' is not assignable to parameter of type 'DocumentApproval'.
```

### Retrieving the Enum Name

You can retrieve the registered name of an enum object, which is useful for metaprogramming, serialization, or logging.

```typescript
import { defineEnum, getEnumName, tryGetEnumName } from '@tstdl/base/enumeration';

const UserRole = defineEnum('UserRole', {
  Admin: 'admin',
  Editor: 'editor',
  Viewer: 'viewer',
});

const unregisteredEnum = { a: 1 };

// Get the name, throws if not found
const name = getEnumName(UserRole);
console.log(name); // Outputs: "UserRole"

// Safely get the name, returns undefined if not found
const safeName = tryGetEnumName(UserRole);
const unknownName = tryGetEnumName(unregisteredEnum);

console.log(safeName); // Outputs: "UserRole"
console.log(unknownName); // Outputs: undefined
```

## API Summary

### Functions

-   `defineEnum<const T>(name: string, enumObject: T): T`
    Registers an `enumObject` with a given `name` and returns the object.
    -   **`name`**: `string` - The runtime name for the enum.
    -   **`enumObject`**: `T` - An object with string or number values.
    -   **Returns**: `T` - The original `enumObject`.

-   `getEnumName(enumeration: object): string`
    Retrieves the registered name for an enum object. Throws an error if the enum is not registered.
    -   **`enumeration`**: `object` - The enum object created with `defineEnum`.
    -   **Returns**: `string` - The registered name.

-   `tryGetEnumName(enumeration: object): string | undefined`
    Retrieves the registered name for an enum object. Returns `undefined` if the enum is not registered.
    -   **`enumeration`**: `object` - The enum object.
    -   **Returns**: `string | undefined` - The registered name or `undefined`.

### Types

-   `EnumType<T>`
    A utility type that extracts the union of values from an enum-like object.
    -   **`T`**: The type of the enum object (e.g., `typeof MyEnum`).