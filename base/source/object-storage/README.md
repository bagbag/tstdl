# @tstdl/base/object-storage

A flexible and extensible module for handling object storage, providing an abstraction layer over concrete implementations like S3.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Injecting and Using `ObjectStorage`](#injecting-and-using-objectstorage)
  - [Lifecycle Management](#lifecycle-management)
- [API Summary](#api-summary)

## Features

- **Abstract `ObjectStorage` Class**: Enables implementation-agnostic file handling, making your application more testable and adaptable.
- **S3-Compatible Implementation**: Includes a robust `S3ObjectStorage` class for any S3-compatible service (e.g., AWS S3, MinIO).
- **Module-based Isolation**: Isolate objects within a single bucket using module names as key prefixes or use a dedicated bucket per module.
- **Automatic Bucket Management**: Handles bucket creation and lifecycle configuration (e.g., object expiration) on initialization.
- **Comprehensive Object Operations**: Supports a full suite of object operations: upload, download, copy, move, delete, stat, and list.
- **Pre-signed URLs**: Generate secure, temporary URLs for direct browser uploads or downloads, offloading traffic from your application server.
- **Stream-based I/O**: Efficiently handles large files using streams to minimize memory consumption.
- **DI-Friendly**: Designed to integrate seamlessly with `@tstdl/base/injector` for easy dependency injection and resolution.

## Core Concepts

The module is built around a few key abstractions to ensure flexibility and ease of use.

### `ObjectStorage`

This is the central abstract class that your application services should depend on. It defines a standard contract for all object storage operations. When injecting `ObjectStorage`, you provide a `module` name, which acts as a namespace to logically separate objects (e.g., 'user-avatars', 'invoices'). This prevents key collisions between different parts of your application.

### `ObjectStorageProvider`

A factory responsible for creating `ObjectStorage` instances. The primary implementation is the `S3ObjectStorageProvider`, which creates `S3ObjectStorage` instances configured to communicate with an S3-compatible backend.

### S3 Implementation (`S3ObjectStorage` & `S3ObjectStorageProvider`)

This is the concrete implementation of the storage abstraction for S3-compatible services. It maps the `module` concept to S3 in one of two ways, configured via `S3ObjectStorageProviderConfig`:
1.  **Shared Bucket**: A single bucket is used for all modules, and each `module` name becomes a key prefix (e.g., `my-bucket/user-avatars/image.png`).
2.  **Bucket per Module**: Each `module` maps to its own dedicated S3 bucket (e.g., `user-avatars/image.png`).

### `ObjectStorageObject`

Represents a single object or file within the storage. It provides methods to access its content (`getContent`, `getContentStream`), metadata (`getMetadata`), size (`getContentLength`), and a unique resource URI.

### Configuration (`configureS3ObjectStorage`)

The `configureS3ObjectStorage` function is the main entry point for setup. You provide your S3 connection details (endpoint, credentials, bucket strategy) once, and it registers the S3 provider with the application's dependency injector, making `ObjectStorage` instances available throughout your app.

## Usage

### Configuration

First, configure the S3 provider with your service details. This is typically done once at application startup.

```typescript
import { configureS3ObjectStorage, S3ObjectStorageProviderConfig } from '@tstdl/base/object-storage';

// Configuration for an S3-compatible service like MinIO
const s3Config: S3ObjectStorageProviderConfig = {
  endpoint: 'http://localhost:9000',
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  bucket: 'my-application-bucket', // All modules will use this single bucket
};

// Register the S3 provider for dependency injection
configureS3ObjectStorage(s3Config);
```

### Injecting and Using `ObjectStorage`

Once configured, you can inject and use `ObjectStorage` in any service.

```typescript
import { inject } from '@tstdl/base/injector';
import { ObjectStorage } from '@tstdl/base/object-storage';

class MyFileService {
  // Inject an ObjectStorage instance for the 'user-avatars' module.
  // In the shared bucket 'my-application-bucket', all keys will be prefixed
  // with 'user-avatars/'.
  readonly #avatarStorage = inject(ObjectStorage, 'user-avatars');

  async uploadAvatar(userId: string, content: Uint8Array): Promise<void> {
    const key = `${userId}.png`;
    await this.#avatarStorage.uploadObject(key, content, {
      contentType: 'image/png'
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
import { ObjectStorage, ObjectStorageArgument } from '@tstdl/base/object-storage';

class TemporaryFileService {
  // Inject storage for temporary files that should expire after 1 day (86400 seconds).
  readonly #tempStorage = inject(ObjectStorage, {
    module: 'temp-uploads',
    configuration: {
      lifecycle: {
        expiration: {
          after: 86400 // in seconds
        }
      }
    }
  });

  async storeTemporaryFile(key: string, content: Uint8Array): Promise<void> {
    await this.#tempStorage.uploadObject(key, content);
  }
}
```

## API Summary

### `ObjectStorage` (Abstract Class)

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `exists` | `key: string` | `Promise<boolean>` | Checks if an object exists. |
| `uploadObject` | `key: string`, `content: Uint8Array \| ReadableStream<Uint8Array>`, `options?: UploadObjectOptions` | `Promise<void>` | Uploads an object. |
| `copyObject` | `sourceKey: string`, `destinationKey: string \| [ObjectStorage, string]`, `options?: CopyObjectOptions` | `Promise<void>` | Copies an object. |
| `moveObject` | `sourceKey: string`, `destinationKey: string \| [ObjectStorage, string]`, `options?: MoveObjectOptions` | `Promise<void>` | Moves an object. |
| `getUploadUrl` | `key: string`, `expirationTimestamp: number`, `options?: UploadUrlOptions` | `Promise<string>` | Gets a pre-signed URL for uploading. |
| `getDownloadUrl` | `key: string`, `expirationTimestamp: number`, `responseHeaders?: Record<string, string>` | `Promise<string>` | Gets a pre-signed URL for downloading. |
| `getObjects` | | `Promise<ObjectStorageObject[]>` | Gets all objects in the module. |
| `getObjectsCursor` | | `AsyncIterable<ObjectStorageObject>` | Gets a cursor for all objects. |
| `getObject` | `key: string` | `Promise<ObjectStorageObject>` | Gets a specific object handle. |
| `getResourceUri` | `key: string` | `Promise<string>` | Gets the unique resource URI. |
| `getContent` | `key: string` | `Promise<Uint8Array>` | Gets the content of an object. |
| `getContentStream` | `key: string` | `ReadableStream<Uint8Array>` | Gets a stream of the object's content. |
| `deleteObject` | `key: string` | `Promise<void>` | Deletes a single object. |
| `deleteObjects` | `keys: string[]` | `Promise<void>` | Deletes multiple objects. |

### `ObjectStorageProvider` (Abstract Class)

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `get` | `module: string` | `ObjectStorage` | Gets an `ObjectStorage` instance for a specific module. |

### `ObjectStorageObject` (Abstract Class)

| Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `getResourceUri` | | `Promise<string>` | Gets the unique resource URI (e.g., `s3://...`). |
| `getContentLength` | | `Promise<number>` | Gets the size of the object in bytes. |
| `getMetadata` | | `Promise<ObjectMetadata>` | Gets the user-defined metadata. |
| `getContent` | | `Promise<Uint8Array>` | Gets the content of the object. |
| `getContentStream` | | `ReadableStream<Uint8Array>` | Gets a stream of the object's content. |

### `configureS3ObjectStorage` (Function)

- `configureS3ObjectStorage(config: S3ObjectStorageProviderConfig, register?: boolean): void`
  - Configures and registers the `S3ObjectStorageProvider` with the dependency injector.