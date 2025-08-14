# TypeScript Type Utilities (`@tstdl/base/types`)

A comprehensive collection of fundamental, advanced, and specialized TypeScript utility types designed to enhance type safety, improve developer experience, and provide standard type definitions for common data structures.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [General Utility Types](#general-utility-types)
  - [Tagged Types](#tagged-types)
  - [GeoJSON Types](#geojson-types)
- [Usage](#usage)
  - [General Utilities](#general-utilities)
  - [Tagged Types](#tagged-types)
  - [GeoJSON Types](#geojson-types)
- [API Summary](#api-summary)
  - [General Utility Types](#general-utility-types-1)
  - [Tagged Types](#tagged-types-1)
  - [GeoJSON Types](#geojson-types-1)
  - [Web Types](#web-types)

## Features

- **Rich Utility Belt**: A vast collection of utility types for advanced type manipulation, including `Writable`, `DeepPartial`, `Simplify`, `PickBy`, `OmitBy`, `Optionalize`, and many more.
- **Tagged (Branded) Types**: A robust implementation to create distinct types from primitives (e.g., `string`, `number`) for improved type safety.
- **GeoJSON Types**: A complete set of type definitions for all standard GeoJSON objects, compliant with RFC 7946.
- **Web-related Types**: Standardized types for HTML input attributes like `InputType`, `InputMode`, and `InputAutocomplete`.

## Core Concepts

### General Utility Types

This module provides a rich set of utility types inspired by popular libraries like `type-fest`. These types allow you to manipulate, transform, and inspect other types in powerful ways. They help in creating more precise and expressive types, reducing boilerplate, and catching potential errors at compile time. For example, you can make all properties of an object writable, pick properties based on their type, or simplify complex inferred types for better readability in tooltips.

### Tagged Types

In many applications, primitives like `string` or `number` are used to represent different kinds of data, such as a user ID, a product ID, or an email address. While they are all strings, they are not semantically interchangeable. Assigning a `ProductId` to a variable expecting a `UserId` can lead to bugs.

**Tagged Types** solve this problem by creating new, distinct types that are not directly assignable to each other, even if they share the same underlying primitive type. This module provides a `Tagged<Type, TagName>` utility to easily create these types. This pattern is also known as "nominal typing" or "branded types" and significantly enhances type safety by catching logical errors at compile time.

### GeoJSON Types

GeoJSON is a standard format for encoding a variety of geographic data structures. This module provides a comprehensive set of TypeScript interfaces (`Point`, `LineString`, `Polygon`, `Feature`, `FeatureCollection`, etc.) that align with the official GeoJSON specification. These types ensure that your geospatial data structures are correctly typed and validated by the TypeScript compiler.

## Usage

### General Utilities

Here are some examples of how to use the general utility types to manipulate and refine your types.

```typescript
import type { Writable, Simplify, Optionalize } from '@tstdl/base/types';

// Making a readonly object writable
const user = { id: 1, name: 'John' } as const;
type WritableUser = Writable<typeof user>; // { id: number; name: string; }
const mutableUser: WritableUser = { id: 1, name: 'John' };
mutableUser.name = 'Jane'; // OK

// Simplifying a complex inferred type for cleaner tooltips
type Complex = Pick<{ a: 1 } & { b: 2 }, 'a' | 'b'>; // Inferred as Pick<{ a: 1; } & { b: 2; }, "a" | "b">
type Simple = Simplify<Complex>; // Inferred as { a: 1; b: 2; }

// Making properties with `| undefined` optional
type ProductWithUndefined = {
  id: string;
  description: string | undefined;
  price: number;
};
type OptionalProduct = Optionalize<ProductWithUndefined>;
// type is { id: string; description?: string | undefined; price: number; }
const product: OptionalProduct = { id: 'p1', price: 100 }; // OK, description is optional
```

### Tagged Types

You can create distinct types for different kinds of IDs, even though they are all strings.

```typescript
import type { Tagged } from '@tstdl/base/types';

// Define distinct types for User and Product IDs
type UserId = Tagged<string, 'UserId'>;
type ProductId = Tagged<string, 'ProductId'>;

// Functions that operate on specific ID types
function getUser(id: UserId): void {
  console.log(`Fetching user with ID: ${id}`);
}

function getProduct(id: ProductId): void {
  console.log(`Fetching product with ID: ${id}`);
}

// You must cast a primitive to the tagged type.
const userId = 'user-123' as UserId;
const productId = 'prod-456' as ProductId;
const plainString = 'some-string';

getUser(userId); // OK
getProduct(productId); // OK

// The following lines will cause a TypeScript compilation error,
// preventing logical mistakes.
// getUser(productId); // Error: Type 'ProductId' is not assignable to type 'UserId'.
// getUser(plainString); // Error: Type 'string' is not assignable to type 'UserId'.
```

### GeoJSON Types

Define a GeoJSON `Feature` with a `Point` geometry.

```typescript
import type { Feature, Point } from '@tstdl/base/types';

// Define properties for your feature
interface ParkProperties {
  name: string;
  area: number; // in square meters
}

// Create a GeoJSON Feature object
const parkFeature: Feature<Point, ParkProperties> = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [-73.9654, 40.7829], // [longitude, latitude]
  },
  properties: {
    name: 'Central Park',
    area: 3410000,
  },
};

function logLocation(feature: Feature<Point, ParkProperties>): void {
  const [longitude, latitude] = feature.geometry.coordinates;
  console.log(`${feature.properties.name} is at ${latitude}, ${longitude}`);
}

logLocation(parkFeature);
```

## API Summary

### General Utility Types

This module provides a wide array of utility types for type manipulation. Below are some of the most common ones.

| Type                    | Description                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `Writable<T>`           | Makes all properties of `T` mutable (removes `readonly`).                                           |
| `DeepWritable<T>`       | Recursively makes all properties of `T` mutable.                                                    |
| `DeepPartial<T>`        | Recursively makes all properties of `T` optional.                                                   |
| `Simplify<T>`           | Flattens intersection types (`&`) into a single object type for better readability.                 |
| `Optionalize<T>`        | Converts properties of `T` that can be `undefined` into optional properties (`?`).                  |
| `PickBy<T, V>`          | Creates a type by picking properties from `T` whose values are assignable to `V`.                   |
| `OmitBy<T, V>`          | Creates a type by omitting properties from `T` whose values are assignable to `V`.                  |
| `OneOrMany<T>`          | Represents a single `T` or a `readonly T[]`.                                                        |
| `Json`                  | Represents any valid JSON value (`string \| number \| boolean \| null \| JsonObject \| JsonArray`). |
| `Paths<T>`              | Creates a union of all possible dot-notation paths for keys in object `T`.                          |
| `TypeFromPath<T, Path>` | Infers the type of a property in `T` at a given `Path`.                                             |
| `PickDeep<T, S>`        | Picks properties from `T` recursively based on a selection shape `S`.                               |
| `OmitDeep<T, S>`        | Omits properties from `T` recursively based on a selection shape `S`.                               |

### Tagged Types

| Type                            | Description                                                                 |
| ------------------------------- | --------------------------------------------------------------------------- |
| `Tagged<Type, TagName>`         | Creates a new, distinct ("branded") type from a base `Type`.                |
| `Untagged<T>`                   | Extracts the base, untagged type from a `Tagged` type.                      |
| `GetTagMetadata<Type, TagName>` | Extracts the metadata from a `Tagged` type.                                 |
| `HasTag<T, Token>`              | Checks if a type `T` has a specific tag `Token`. Returns `true` or `false`. |

### GeoJSON Types

| Type                      | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `Position`                | A tuple representing coordinates: `[longitude, latitude, elevation?]`. |
| `Point`                   | A GeoJSON geometry object with a single `Position`.                    |
| `LineString`              | A GeoJSON geometry object with an array of `Position`s.                |
| `Polygon`                 | A GeoJSON geometry object with an array of `Position` arrays.          |
| `Geometry`                | A union of all possible GeoJSON geometry types.                        |
| `Feature<G, P>`           | A GeoJSON object containing a `Geometry` object and properties.        |
| `FeatureCollection<G, P>` | A GeoJSON object containing an array of `Feature` objects.             |

### Web Types

| Type                 | Description                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `InputType`          | A literal union of all valid `type` attribute values for an HTML `<input>` element.         |
| `InputMode`          | A literal union of all valid `inputmode` attribute values for an HTML `<input>` element.    |
| `InputAutocomplete`  | A literal union of all valid `autocomplete` attribute values for an HTML `<input>` element. |
| `InputAttributes`    | An object type representing all valid attributes for an HTML `<input>` element.             |
| `TextAreaAttributes` | An object type representing all valid attributes for an HTML `<textarea>` element.          |
