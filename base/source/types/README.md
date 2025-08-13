# Core Type Utilities (`@tstdl/base/types`)

A collection of fundamental and specialized TypeScript types, including tagged types for enhanced type-safety and standard GeoJSON types for geospatial data modeling.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Tagged Types](#tagged-types)
  - [GeoJSON Types](#geojson-types)
- [Usage](#usage)
  - [Creating and Using Tagged Types](#creating-and-using-tagged-types)
  - [Using GeoJSON Types](#using-geojson-types)
- [API Summary](#api-summary)

## Features

- **Tagged Types**: A robust implementation of tagged (or "branded") types to create distinct types from primitives (e.g., `string`, `number`) for improved type safety.
- **GeoJSON Types**: A complete set of type definitions for all standard GeoJSON objects, compliant with RFC 7946.

## Core Concepts

### Tagged Types

In many applications, primitives like `string` or `number` are used to represent different kinds of data, such as a user ID, a product ID, or an email address. While they are all strings, they are not semantically interchangeable. Assigning a `ProductId` to a variable expecting a `UserId` can lead to bugs.

**Tagged Types** solve this problem by creating new, distinct types that are not directly assignable to each other, even if they share the same underlying primitive type. This module provides a `Tagged<Type, TagName>` utility to easily create these types.

This pattern is also known as "nominal typing" or "branded types" and significantly enhances type safety by catching logical errors at compile time.

### GeoJSON Types

GeoJSON is a standard format for encoding a variety of geographic data structures. This module provides a comprehensive set of TypeScript interfaces (`Point`, `LineString`, `Polygon`, `Feature`, `FeatureCollection`, etc.) that align with the official GeoJSON specification. These types ensure that your geospatial data structures are correctly typed and validated by the TypeScript compiler.

## Usage

First, install the module if you haven't already and import the necessary types.

```typescript
import type { Tagged, Untagged, Feature, Point } from '@tstdl/base/types';
```

### Creating and Using Tagged Types

You can create distinct types for different kinds of IDs, even though they are all strings.

```typescript
import type { Tagged } from '@tstdl/base/types';

// Define distinct types for User and Post IDs
type UserId = Tagged<string, 'UserId'>;
type PostId = Tagged<string, 'PostId'>;

// Functions that operate on specific ID types
function getUser(id: UserId): void {
  console.log(`Fetching user with ID: ${id}`);
}

function getPost(id: PostId): void {
  console.log(`Fetching post with ID: ${id}`);
}

// You must cast a primitive to the tagged type.
const userId = 'user-123' as UserId;
const postId = 'post-456' as PostId;
const plainString = 'some-string';

getUser(userId); // OK
getPost(postId); // OK

// The following lines will cause a TypeScript compilation error,
// preventing logical mistakes.
// getUser(postId); // Error: Type 'PostId' is not assignable to type 'UserId'.
// getUser(plainString); // Error: Type 'string' is not assignable to type 'UserId'.
```

To retrieve the original primitive type from a tagged type, you can use `Untagged`.

```typescript
import type { Tagged, Untagged } from '@tstdl/base/types';

type UserId = Tagged<string, 'UserId'>;

type RawId = Untagged<UserId>; // Type is `string`
```

### Using GeoJSON Types

Define a GeoJSON `Feature` with a `Point` geometry.

```typescript
import type { Feature, Point } from '@tstdl/base/types';

// Define properties for your feature
interface LocationProperties {
  name: string;
  city: string;
}

// Create a GeoJSON Feature object
const officeLocation: Feature<Point, LocationProperties> = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [-74.0445, 40.6892] // [longitude, latitude]
  },
  properties: {
    name: 'Statue of Liberty',
    city: 'New York'
  }
};

function processLocation(feature: Feature<Point, LocationProperties>): void {
  const [longitude, latitude] = feature.geometry.coordinates;
  console.log(`${feature.properties.name} is at ${latitude}, ${longitude}`);
}

processLocation(officeLocation);
```

## API Summary

This module primarily exports TypeScript types.

### Tagged Types

-   `Tagged<Type, TagName, TagMetadata>`: Creates a new, distinct type.
    -   `Type`: The underlying base type (e.g., `string`).
    -   `TagName`: A unique string literal to identify the tag (e.g., `'UserId'`).
    -   `TagMetadata` (optional): Additional metadata associated with the tag.
-   `Untagged<T>`: Extracts the base, untagged type from a `Tagged` type.
-   `UnwrapTagged<TaggedType>`: An alias for `Untagged<T>`.
-   `GetTagMetadata<Type, TagName>`: Extracts the metadata from a `Tagged` type.
-   `HasTag<T, Token>`: A utility type to check if a type `T` has a specific tag `Token`. Returns `true` or `false`.

### GeoJSON Types

A collection of interfaces compliant with the GeoJSON specification.

-   `Position`: A tuple representing coordinates: `[longitude, latitude, elevation?]`.
-   `Point`: A GeoJSON object with a single `Position`.
-   `LineString`: A GeoJSON object with an array of `Position`s.
-   `Polygon`: A GeoJSON object with an array of `Position` arrays, representing linear rings.
-   `MultiPoint`: A GeoJSON object with an array of `Position`s.
-   `MultiLineString`: A GeoJSON object with an array of `LineString` coordinate arrays.
-   `MultiPolygon`: A GeoJSON object with an array of `Polygon` coordinate arrays.
-   `Geometry`: A union of all possible geometry types (`Point`, `LineString`, etc.).
-   `GeometryCollection`: A GeoJSON object containing an array of `Geometry` objects.
-   `Feature<G, P>`: A GeoJSON object that contains a `Geometry` object and properties.
    -   `G`: The type of the `Geometry` (e.g., `Point`). Defaults to `null`.
    -   `P`: An object type for the `properties`. Defaults to `null`.
-   `FeatureCollection<G, P>`: A GeoJSON object containing an array of `Feature` objects.