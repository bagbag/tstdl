# Search Index

A module providing an abstraction layer for search functionalities, with implementations for Elasticsearch and in-memory search.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [SearchIndex](#searchindex)
  - [ElasticSearchIndex](#elasticsearchindex)
  - [MemorySearchIndex](#memorysearchindex)
  - [Querying and Pagination](#querying-and-pagination)
- [Usage](#usage)
  - [ElasticSearchIndex](#elasticsearch-usage)
  - [MemorySearchIndex](#in-memory-usage)
- [API Summary](#api-summary)

## Features

- **Abstract Base Class**: `SearchIndex` defines a common interface for different search backends.
- **Elasticsearch Integration**: `ElasticSearchIndex` provides a robust, feature-rich implementation using Elasticsearch.
- **In-Memory Implementation**: `MemorySearchIndex` offers a lightweight, dependency-free option for testing or simple use cases.
- **Query Conversion**: Automatically converts standard database queries into Elasticsearch-compatible queries.
- **Cursor-Based Pagination**: Efficiently paginate through large result sets using cursors.
- **Index Management**: Helpers for creating and managing Elasticsearch indices.

## Core Concepts

This module is designed around a central abstraction, `SearchIndex`, which provides a standardized way to interact with different search backends.

### SearchIndex

`SearchIndex<T>` is an abstract class that defines the contract for all search index implementations. It standardizes operations like indexing, deleting, searching, and counting documents (entities). This allows your application to switch between different search backends with minimal code changes.

### ElasticSearchIndex

`ElasticSearchIndex<T>` is the primary implementation that integrates with Elasticsearch. It leverages the power and scalability of Elasticsearch for complex search scenarios.

Key features include:
- **Automatic Query Conversion**: It translates the module's standard `Query<T>` objects into the Elasticsearch Query DSL, allowing developers to use a familiar query syntax.
- **Index Lifecycle Management**: The class can automatically create and configure the Elasticsearch index on initialization based on the provided mapping and settings.
- **Sorting and Pagination**: It fully supports sorting and provides efficient cursor-based pagination for handling large datasets.

### MemorySearchIndex

`MemorySearchIndex<T>` is a simple, in-memory implementation of the `SearchIndex` interface. It's useful for:
-   **Unit and Integration Testing**: Mocking a search index without needing a running Elasticsearch instance.
-   **Small-Scale Applications**: Handling search for small, non-persistent datasets.

It performs text-based searches on specified fields but does not support the full range of complex queries available in Elasticsearch.

### Querying and Pagination

The `search()` method accepts a `Query<T>` object, which is the same format used by the database modules. For `ElasticSearchIndex`, this query is converted into a native Elasticsearch query.

For large result sets, it's recommended to use cursor-based pagination instead of `skip`/`limit`. The `search()` method returns a `cursor` in its result, which can be passed to the next `search()` call to get the next page. The `searchCursor()` async iterator simplifies this process.

## Usage

### Elasticsearch Usage

This example demonstrates how to set up and use `ElasticSearchIndex` to index and search for `Product` entities.

#### 1. Setup

First, configure the Elasticsearch client and define your index settings and mapping.

```typescript
import { configureElasticsearch, ElasticIndexMapping, ElasticSearchIndex, ElasticSearchIndexConfig, IndicesIndexSettings, KeywordRewriter } from '@tstdl/base/search-index/elastic';
import { Client } from '@elastic/elasticsearch';
import { Injector } from '@tstdl/base/injector';
import { Logger } from '@tstdl/base/logger';

// Entity definition
class Product {
  id: string;
  name: string;
  description: string;
  price: number;
  inStock: boolean;
}

// Configure the Elasticsearch connection
configureElasticsearch({
  defaultOptions: { node: 'http://localhost:9200' }
});

// Define index settings and mapping
const productIndexSettings: IndicesIndexSettings = {
  analysis: {
    analyzer: {
      default: {
        tokenizer: 'standard',
        filter: ['lowercase']
      }
    }
  }
};

const productIndexMapping: ElasticIndexMapping<Product> = {
  properties: {
    name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    description: { type: 'text' },
    price: { type: 'double' },
    inStock: { type: 'boolean' }
  }
};

// Create a configuration class for your index
class ProductIndexConfig extends ElasticSearchIndexConfig<Product> {
  constructor() {
    super('products'); // The name of the index in Elasticsearch
  }
}

// Create the Search Index instance
const client = Injector.resolve(Client);
const logger = Injector.resolve(Logger);

const productSearchIndex = new ElasticSearchIndex<Product>(
  client,
  new ProductIndexConfig(),
  productIndexSettings,
  productIndexMapping,
  ['name'], // Fields to rewrite with ".keyword" for exact sorting/matching
  logger
);

// Creates the index if it doesn't exist
await productSearchIndex.initialize();
```

#### 2. Indexing Data

Use the `index()` method to add or update documents in the index.

```typescript
const products: Product[] = [
  { id: 'p1', name: 'Laptop Pro', description: 'A powerful laptop for professionals.', price: 1500, inStock: true },
  { id: 'p2', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse.', price: 50, inStock: true },
  { id: 'p3', name: 'Mechanical Keyboard', description: 'A great keyboard for typing.', price: 120, inStock: false }
];

await productSearchIndex.index(products);

// Make the indexed documents available for search
await productSearchIndex.refresh();
```

#### 3. Searching

Use the `search()` method with a query object.

```typescript
// Find products with "laptop" in the description
const searchResult = await productSearchIndex.search({ description: { $text: 'laptop' } });
console.log(searchResult.items);
// [
//   {
//     entity: { id: 'p1', name: 'Laptop Pro', ... },
//     score: 0.2876821
//   }
// ]

// Search with sorting and limit
const expensiveProducts = await productSearchIndex.search(
  { inStock: true },
  {
    sort: [{ field: 'price', order: 'desc' }],
    limit: 1
  }
);
console.log(expensiveProducts.items[0]?.entity.name); // 'Laptop Pro'
```

#### 4. Pagination with Cursors

For paginating through large datasets, use the returned cursor.

**Manual Pagination**

```typescript
let results = await productSearchIndex.search(
  {},
  { limit: 1, sort: [{ field: 'price', order: 'asc' }] }
);

console.log(results.items[0]?.entity.name); // 'Wireless Mouse'

if (results.cursor) {
  // Pass the cursor to get the next page
  results = await productSearchIndex.search(results.cursor);
  console.log(results.items[0]?.entity.name); // 'Mechanical Keyboard'
}
```

**Using the `searchCursor` Async Iterator**

The `searchCursor` helper simplifies pagination.

```typescript
for await (const item of productSearchIndex.searchCursor({}, { sort: [{ field: 'price', order: 'asc' }] })) {
  console.log(item.entity.name);
}
// Wireless Mouse
// Mechanical Keyboard
// Laptop Pro
```

#### 5. Deleting and Counting

```typescript
// Delete by ID
await productSearchIndex.delete('p3');

// Delete by query
await productSearchIndex.deleteByQuery({ name: { $text: 'mouse' } });

// Count documents
const count = await productSearchIndex.count({ inStock: true });
console.log(`Products in stock: ${count}`);
```

### In-Memory Usage

The `MemorySearchIndex` is ideal for tests or simple scenarios.

```typescript
import { MemorySearchIndex } from '@tstdl/base/search-index/memory';

class Pet {
  id: string;
  name: string;
  species: string;
  age: number;
}

// 1. Create an instance specifying which fields to index for text search
const petSearchIndex = new MemorySearchIndex<Pet>(['name', 'species']);

// 2. Index documents
const pets: Pet[] = [
  { id: 'pet1', name: 'Fido', species: 'Dog', age: 3 },
  { id: 'pet2', name: 'Whiskers', species: 'Cat', age: 5 },
  { id: 'pet3', name: 'Buddy', species: 'Dog', age: 7 }
];
await petSearchIndex.index(pets);

// 3. Search for documents
const dogResults = await petSearchIndex.search({ species: { $text: 'dog' } });
console.log(dogResults.items.map(item => item.entity.name)); // ['Fido', 'Buddy']

// 4. Delete a document
await petSearchIndex.delete('pet2');
const catResults = await petSearchIndex.search({ species: { $text: 'cat' } });
console.log(catResults.items.length); // 0
```

## API Summary

| Class / Function                       | Description                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `SearchIndex<T>`                       | Abstract base class for search index implementations.                                                   |
| `index(entities: T[])`                 | Indexes or updates an array of entities.                                                                |
| `delete(id: string)`                   | Deletes an entity by its ID.                                                                            |
| `deleteByQuery(query: Query<T>)`       | Deletes all entities matching the query.                                                                |
| `search(query / cursor, options?)`     | Searches for entities. Returns a `SearchResult` with items and an optional cursor for pagination.         |
| `count(query?, options?)`              | Counts entities matching the query.                                                                     |
| `searchCursor(query, options?)`        | An async iterator to easily paginate through all results of a search.                                   |
| `drop()`                               | Drops the entire index.                                                                                 |
| `ElasticSearchIndex<T>`                | An implementation of `SearchIndex` using Elasticsearch as the backend.                                  |
| `MemorySearchIndex<T>`                 | An in-memory implementation of `SearchIndex`.                                                           |
| `configureElasticsearch(config)`       | Configures the default Elasticsearch client options for the application.                                |
| `SearchIndexError`                     | Custom error class for search-related issues.                                                           |
| `SearchResult<T>`                      | The return type for `search()`, containing items, total count, and pagination cursor.                   |
| `SearchResultItem<T>`                  | An object containing the found entity and its relevance score.                                          |