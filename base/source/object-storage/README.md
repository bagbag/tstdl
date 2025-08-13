# @tstdl/base/object-storage

A flexible and extensible module for handling object storage, providing an abstraction layer over concrete implementations like S3.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Injecting and Using `ObjectStorage`](#injecting-and-using-objectstorage)
  - [Lifecycle Management](#lifecycle-management)
  - [Moving and Copying Objects](#moving-and-copying-objects)
  - [Listing Objects](#listing-objects)
- [API Summary](#api-summary)
  - [Setup Function](#setup-function)
  - [S3 Configuration](#s3-configuration)
  - [ObjectStorage Class](#objectstorage-class)
  - [ObjectStorageProvider Class](#objectstorageprovider-class)
  - [ObjectStorageObject Class](#objectstorageobject-class)

## Features

- **Abstract `ObjectStorage` Class**: Enables implementation-agnostic file handling, making your application more testable and adaptable.
- **S3-Compatible Implementation**: Includes a robust `S3ObjectStorage` class for any S3-compatible service (e.g., AWS S3, MinIO).
- **Module-based Isolation**: Isolate objects within a single bucket using module names as key prefixes or use a dedicated bucket per module for stronger separation.
- **Automatic Bucket Management**: Handles bucket creation and lifecycle configuration (e.g., object expiration) on initialization.
- **Comprehensive Object Operations**: Supports a full suite of object operations: upload, download, copy, move, delete, stat, and list.
- **Pre-signed URLs**: Generate secure, temporary URLs for direct browser uploads or downloads, offloading traffic from your application server.
- **Stream-based I/O**: Efficiently handles large files using `ReadableStream<Uint8Array>` to minimize memory consumption.
- **DI-Friendly**: Designed to integrate seamlessly with `@tstdl/base/injector` for easy dependency injection and resolution.

## Core Concepts

The module is built around a few key abstractions to ensure flexibility and ease of use.

### `ObjectStorage`

This is the central abstract class that your application services should depend on. It defines a standard contract for all object storage operations. When injecting `ObjectStorage`, you provide a `module` name, which acts as a namespace to logically separate objects (e.g., 'user-avatars', 'invoices'). This prevents key collisions between different parts of your application.

### `ObjectStorageProvider`

A factory responsible for creating `ObjectStorage` instances. The primary implementation is the `S3ObjectStorageProvider`, which creates `S3ObjectStorage` instances configured to communicate with an S3-compatible backend.

### S3 Implementation (`S3ObjectStorage` & `S3ObjectStorageProvider`)

This is the concrete implementation of the storage abstraction for S3-compatible services. It maps the `module` concept to S3 in one of two ways, configured via `S3ObjectStorageProviderConfig`:

1.  **Shared Bucket**: A single `bucket` is used for all modules, and each `module` name becomes a key prefix (e.g., `my-bucket/user-avatars/image.png`).
2.  **Bucket per Module**: `bucketPerModule` is set to `true`, and each `module` name maps to its own dedicated S3 bucket (e.g., `user-avatars/image.png`).

### `ObjectStorageObject`

Represents a single object or file within the storage. It provides methods to access its content (`getContent`, `getContentStream`), metadata (`getMetadata`), size (`getContentLength`), and a unique resource URI.

## Usage

### Configuration

First, configure the S3 provider with your service details. This is typically done once at application startup.

**Example 1: Single Shared Bucket**
All modules will be stored as prefixed folders within `my-application-bucket`.

```typescript
import { configureS3ObjectStorage } from '@tstdl/base/object-storage';

configureS3ObjectStorage({
  endpoint: 'http://localhost:9000',
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  bucket: 'my-application-bucket', // All modules use this single bucket
});
```

**Example 2: Bucket per Module**
A module named `user-avatars` will be stored in a bucket named `user-avatars`.

```typescript
import { configureS3ObjectStorage } from '@tstdl/base/object-storage';

configureS3ObjectStorage({
  endpoint: 'http://localhost:9000',
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  bucketPerModule: true, // Each module gets its own bucket
});
```

### Injecting and Using `ObjectStorage`

Once configured, you can inject and use `ObjectStorage` in any service.

```typescript
import { inject } from '@tstdl/base/injector';
import { ObjectStorage } from '@tstdl/base/object-storage';

class MyFileService {
  // Inject an ObjectStorage instance for the 'user-avatars' module.
  readonly #avatarStorage = inject(ObjectStorage, 'user-avatars');

  async uploadAvatar(userId: string, content: Uint8Array): Promise<void> {
    const key = `${userId}.png`;
    await this.#avatarStorage.uploadObject(key, content, {
      contentType: 'image/png',
    });
  }

  async getAvatarUrl(userId: string): Promise<string> {
    const key = `${userId}.png`;

    // Generate a temporary URL that expires in one hour
    const oneHourFromNow = Date.now() + 3600 * 1000;
    return this.#avatarStorage.getDownloadUrl(key, oneHourFromNow);
  }

  async getAvatarContent(userId: string): Promise<Uint8Array> {
    const key = `${userId}.png`;
    return this.#avatarStorage.getContent(key);
  }

  async deleteAvatar(userId: string): Promise<void> {
    const key = `${userId}.png`;
    await this.#avatarStorage.deleteObject(key);
  }
}
```

### Lifecycle Management

You can configure object lifecycle policies, such as expiration, when injecting an `ObjectStorage` instance.

```typescript
import { inject } from '@tstdl/base/injector';
import { ObjectStorage, type ObjectStorageArgument } from '@tstdl/base/object-storage';
import { secondsPerDay } from '@tstdl/base/utils';

class TemporaryFileService {
  // Inject storage for temporary files that should expire after 1 day.
  readonly #tempStorage = inject(ObjectStorage, {
    module: 'temp-uploads',
    configuration: {
      lifecycle: {
        expiration: {
          after: 1 * secondsPerDay,
        },
      },
    },
  });

  async storeTemporaryFile(key: string, content: Uint8Array): Promise<void> {
    await this.#tempStorage.uploadObject(key, content);
  }
}
```

### Moving and Copying Objects

You can move or copy objects within the same module, or even between different modules.

```typescript
import { inject } from '@tstdl/base/injector';
import { ObjectStorage } from '@tstdl/base/object-storage';

class FileManager {
  readonly #stagingStorage = inject(ObjectStorage, 'staging');
  readonly #permanentStorage = inject(ObjectStorage, 'permanent');

  async promoteFile(key: string): Promise<void> {
    // Move the file from the 'staging' module to the 'permanent' module.
    await this.#stagingStorage.moveObject(key, [this.#permanentStorage, key]);
  }
}
```

### Listing Objects

You can list all objects within a module using an async iterable, which is memory-efficient for large numbers of objects.

```typescript
import { inject } from '@tstdl/base/injector';
import { ObjectStorage } from '@tstdl/base/object-storage';

class ReportService {
  readonly #reportStorage = inject(ObjectStorage, 'daily-reports');

  async processAllReports(): Promise<void> {
    for await (const reportObject of this.#reportStorage.getObjectsCursor()) {
      console.log(`Processing report: ${reportObject.key}`);
      const content = await reportObject.getContent();
      // ... process content
    }
  }
}
```

## API Summary

### Setup Function

| Function                                                                                    | Description                                                                          |
| :------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------- |
| `configureS3ObjectStorage(config: S3ObjectStorageProviderConfig, register?: boolean): void` | Configures and registers the `S3ObjectStorageProvider` with the dependency injector. |

### S3 Configuration

**`S3ObjectStorageProviderConfig`**

| Property          | Type                 | Description                                                                                     |
| :---------------- | :------------------- | :---------------------------------------------------------------------------------------------- |
| `endpoint`        | `string`             | The S3 service endpoint URL (e.g., `http://localhost:9000`).                                    |
| `accessKey`       | `string`             | Your S3 access key.                                                                             |
| `secretKey`       | `string`             | Your S3 secret key.                                                                             |
| `bucket`          | `string` (optional)  | The name of a single, shared bucket for all modules. Mutually exclusive with `bucketPerModule`. |
| `bucketPerModule` | `boolean` (optional) | If `true`, each module name maps to a dedicated bucket name. Mutually exclusive with `bucket`.  |

### ObjectStorage Class

| Method             | Arguments                                                                                               | Returns                              | Description                                                                               |
| :----------------- | :------------------------------------------------------------------------------------------------------ | :----------------------------------- | :---------------------------------------------------------------------------------------- |
| `exists`           | `key: string`                                                                                           | `Promise<boolean>`                   | Checks if an object exists.                                                               |
| `uploadObject`     | `key: string`, `content: Uint8Array \| ReadableStream<Uint8Array>`, `options?: UploadObjectOptions`     | `Promise<void>`                      | Uploads an object. `options` can include `contentLength`, `contentType`, and `metadata`.  |
| `copyObject`       | `sourceKey: string`, `destinationKey: string \| [ObjectStorage, string]`, `options?: CopyObjectOptions` | `Promise<void>`                      | Copies an object within the same storage or to another storage instance.                  |
| `moveObject`       | `sourceKey: string`, `destinationKey: string \| [ObjectStorage, string]`, `options?: MoveObjectOptions` | `Promise<void>`                      | Moves an object by copying and then deleting the source.                                  |
| `getUploadUrl`     | `key: string`, `expirationTimestamp: number`, `options?: UploadUrlOptions`                              | `Promise<string>`                    | Gets a pre-signed URL for uploading an object directly.                                   |
| `getDownloadUrl`   | `key: string`, `expirationTimestamp: number`, `responseHeaders?: Record<string, string>`                | `Promise<string>`                    | Gets a pre-signed URL for downloading an object.                                          |
| `getObjects`       |                                                                                                         | `Promise<ObjectStorageObject[]>`     | Gets an array of all objects in the module. Use `getObjectsCursor` for large collections. |
| `getObjectsCursor` |                                                                                                         | `AsyncIterable<ObjectStorageObject>` | Gets a memory-efficient async iterable for all objects in the module.                     |
| `getObject`        | `key: string`                                                                                           | `Promise<ObjectStorageObject>`       | Gets a handle to a specific object.                                                       |
| `getResourceUri`   | `key: string`                                                                                           | `Promise<string>`                    | Gets the unique resource URI for an object (e.g., `s3://bucket/key`).                     |
| `getContent`       | `key: string`                                                                                           | `Promise<Uint8Array>`                | Gets the full content of an object as a byte array.                                       |
| `getContentStream` | `key: string`                                                                                           | `ReadableStream<Uint8Array>`         | Gets a readable stream of the object's content.                                           |
| `deleteObject`     | `key: string`                                                                                           | `Promise<void>`                      | Deletes a single object.                                                                  |
| `deleteObjects`    | `keys: string[]`                                                                                        | `Promise<void>`                      | Deletes multiple objects.                                                                 |

### ObjectStorageProvider Class

| Method | Arguments        | Returns         | Description                                                             |
| :----- | :--------------- | :-------------- | :---------------------------------------------------------------------- |
| `get`  | `module: string` | `ObjectStorage` | Creates or retrieves an `ObjectStorage` instance for a specific module. |

### ObjectStorageObject Class

| Method             | Arguments | Returns                      | Description                                                |
| :----------------- | :-------- | :--------------------------- | :--------------------------------------------------------- |
| `getResourceUri`   |           | `Promise<string>`            | Gets the unique resource URI (e.g., `s3://...`).           |
| `getContentLength` |           | `Promise<number>`            | Gets the size of the object in bytes.                      |
| `getMetadata`      |           | `Promise<ObjectMetadata>`    | Gets the user-defined metadata associated with the object. |
| `getContent`       |           | `Promise<Uint8Array>`        | Gets the content of the object as a byte array.            |
| `getContentStream` |           | `ReadableStream<Uint8Array>` | Gets a readable stream of the object's content.            |
