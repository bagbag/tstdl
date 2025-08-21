# Queue

A robust, multi-backend queueing system for managing and processing background jobs.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Backend Configuration](#backend-configuration)
  - [Getting a Queue Instance](#getting-a-queue-instance)
  - [Enqueueing Jobs](#enqueueing-jobs)
  - [Processing Jobs (Workers)](#processing-jobs-workers)
- [API Summary](#api-summary)
  - [Class: Queue<T>](#class-queuet)
  - [Configuration Functions](#configuration-functions)

## Features

- **Multi-Backend Support**: Seamlessly switch between PostgreSQL and MongoDB backends.
- **Simplified Workers**: Easily create robust workers with the `process()` and `processBatch()` methods, which handle job fetching, acknowledging, and retries automatically.
- **Job Prioritization**: Assign priorities to jobs to ensure important tasks are processed first.
- **Unique Jobs**: Prevent duplicate jobs using tags with configurable strategies (`KeepOld` or `TakeNew`).
- **Batch Operations**: Enqueue multiple jobs in a single, efficient operation using `enqueueMany` or the `batch()` helper.
- **Automatic Retries**: Failed jobs are automatically retried up to a configurable number of times with exponential backoff.
- **Configurable Timeouts**: Set a processing timeout for each queue to prevent jobs from getting stuck.
- **Robust Consumer Patterns**: For advanced use cases, create custom consumers using async iterators (`getConsumer` and `getBatchConsumer`).

## Core Concepts

### Queue

The `Queue<T>` class is the central point of interaction. Each queue is identified by a unique name and handles a specific type of job data (`T`). It provides methods for enqueueing, processing, and managing jobs.

### Job

A `Job` represents a single unit of work. It contains the data payload to be processed, a priority level, an optional tag for identification, and metadata such as the number of tries and timestamps.

### Provider (`QueueProvider`)

The `QueueProvider` is a factory responsible for creating `Queue` instances. This abstraction allows the system to support different storage backends. Implementations like `PostgresQueueProvider` or `MongoQueueProvider` are used to get queue instances connected to the appropriate database.

### Worker (Consumer)

A worker is a process that fetches jobs from a queue and executes them. This module simplifies worker creation with the `process()` and `processBatch()` methods, which encapsulate the logic for fetching jobs, executing the handler, acknowledging success, and handling failures for retries.

### Unique Tags

You can assign a `tag` (a string) to a job. When combined with a `uniqueTag` strategy, this mechanism prevents duplicate jobs from being enqueued.

- **`UniqueTagStrategy.KeepOld`**: If a job with the same tag already exists, the new job is discarded.
- **`UniqueTagStrategy.TakeNew`**: If a job with the same tag already exists, it is overwritten by the new job.

## Usage

### Backend Configuration

First, configure the queue provider in your application's setup file.

#### PostgreSQL

```typescript
// In your application's bootstrap file
import { configurePostgresQueue } from '@tstdl/base/queue/postgres';

// This will use the default database configuration.
// You can provide a specific database configuration if needed.
configurePostgresQueue();
```

### Getting a Queue Instance

Use the dependency injector to get an instance of a specific queue by its name. The job's data type should be provided as a generic argument.

```typescript
import { Queue } from '@tstdl/base/queue';
import { Injector } from '@tstdl/base/injector';

type ProcessProductImageJob = {
  productId: string;
  imageUrl: string;
};

// Get a queue named 'image-processing'
const imageQueue = Injector.resolve<Queue<ProcessProductImageJob>>(Queue, 'image-processing');
```

### Enqueueing Jobs

#### Enqueueing a Single Job

Add a new job to the queue with the required data payload.

```typescript
await imageQueue.enqueue({
  productId: 'prod-123',
  imageUrl: 'https://example.com/image.jpg'
});

console.log('Image processing job enqueued.');
```

#### Enqueueing with Options

You can specify options like priority, tags, and unique job strategies.

```typescript
import { UniqueTagStrategy } from '@tstdl/base/queue';

// This job has a high priority (lower number is higher).
// If a job with the tag 'product-image-prod-456' already exists, it will be replaced.
await imageQueue.enqueue(
  { productId: 'prod-456', imageUrl: 'https://example.com/another.jpg' },
  {
    priority: 100, // Default is 1000
    tag: 'product-image-prod-456',
    uniqueTag: UniqueTagStrategy.TakeNew
  }
);
```

#### Enqueueing a Batch of Jobs

For performance, you can enqueue multiple jobs at once using `enqueueMany` or the `batch()` helper.

**Using `enqueueMany`:**

```typescript
await imageQueue.enqueueMany([
  { data: { productId: 'prod-789', imageUrl: '...' } },
  { data: { productId: 'prod-101', imageUrl: '...' }, priority: 500 }
]);
```

**Using the `batch()` helper:**

```typescript
const batch = imageQueue.batch();

batch.add({ productId: 'prod-789', imageUrl: '...' });
batch.add({ productId: 'prod-101', imageUrl: '...' }, { priority: 500 });

await batch.enqueue(); // Enqueues all added jobs in one operation
```

### Processing Jobs (Workers)

Workers are responsible for executing the logic for jobs on the queue. The `process` and `processBatch` methods provide a simple and robust way to create them. These methods automatically handle fetching jobs, acknowledging them on success, and allowing them to be retried on failure.

#### Processing Jobs One by One

Create a worker to process jobs individually. You can run multiple workers in parallel by adjusting the `concurrency` option.

```typescript
import { CancellationSignal } from '@tstdl/base/cancellation';
import { Logger } from '@tstdl/base/logger';

// A function to simulate processing an image
async function processImage(url: string): Promise<void> {
  console.log(`Processing image from ${url}...`);
  // Add image processing logic here. If this throws, the job will be retried.
  await new Promise(resolve => setTimeout(resolve, 500));
}

function startImageWorker(cancellationSignal: CancellationSignal): void {
  const logger = Injector.resolve(Logger);
  logger.info('Image worker started. Waiting for jobs...');

  imageQueue.process(
    { concurrency: 5, cancellationSignal },
    async (job) => {
      logger.verbose(`Processing job ${job.id} for product ${job.data.productId}`);
      await processImage(job.data.imageUrl);
    },
    logger
  );
}
```

#### Processing Jobs in Batches

For high-throughput scenarios, you can process jobs in batches to reduce overhead.

```typescript
function startBatchImageWorker(cancellationSignal: CancellationSignal): void {
  const logger = Injector.resolve(Logger);
  logger.info('Batch image worker started.');

  imageQueue.processBatch(
    { batchSize: 50, concurrency: 2, cancellationSignal },
    async (jobs) => {
      logger.verbose(`Processing a batch of ${jobs.length} jobs.`);
      const imagePromises = jobs.map(job => processImage(job.data.imageUrl));
      await Promise.all(imagePromises);
    },
    logger
  );
}
```

## API Summary

### Class: `Queue<T>`

The main class for interacting with a queue.

| Method | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `enqueue` | `data: T`, `options?: EnqueueOneOptions` | `Promise<Job<T>>` | Adds a single job to the queue. |
| `enqueueMany` | `items: EnqueueManyItem<T>[]`, `options?: EnqueueManyOptions` | `Promise<void \| Job<T>[]>` | Adds multiple jobs. Can optionally return the created jobs. |
| `batch` | | `QueueEnqueueBatch<T>` | Creates a batch enqueue helper for better performance. |
| `dequeue` | | `Promise<Job<T> \| undefined>` | Retrieves a single available job for processing. |
| `dequeueMany` | `count: number` | `Promise<Job<T>[]>` | Retrieves a batch of available jobs. |
| `acknowledge` | `job: Job<T>` | `Promise<void>` | Marks a job as completed, removing it from the queue. |
| `acknowledgeMany`| `jobs: Job<T>[]` | `Promise<void>` | Acknowledges a batch of jobs. |
| `process` | `options`, `handler`, `logger` | `void` | Starts a worker to process jobs one by one. |
| `processBatch` | `options`, `handler`, `logger` | `void` | Starts a worker to process jobs in batches. |
| `getConsumer` | `cancellationSignal` | `AsyncIterableIterator<Job<T>>` | **Advanced:** Returns an async iterator that yields jobs. |
| `getBatchConsumer`| `size`, `cancellationSignal` | `AsyncIterableIterator<Job<T>[]>` | **Advanced:** Returns an async iterator that yields batches of jobs. |
| `get` | `id: string` | `Promise<Job<T> \| undefined>` | Retrieves a job by its ID. |
| `getByTag` | `tag: JobTag` | `Promise<Job<T>[]>` | Retrieves all jobs with a specific tag. |
| `getByTags` | `tags: JobTag[]` | `Promise<Job<T>[]>` | Retrieves all jobs with any of the specified tags. |
| `has` | `id: string` | `Promise<boolean>` | Checks if a job with the given ID exists. |
| `countByTag` | `tag: JobTag` | `Promise<number>` | Counts jobs with a specific tag. |
| `cancel` | `id: string` | `Promise<void>` | Cancels and deletes a job by its ID. |
| `cancelMany` | `ids: string[]` | `Promise<void>` | Cancels and deletes multiple jobs by their IDs. |
| `cancelByTag` | `tag: JobTag` | `Promise<void>` | Cancels all jobs with a specific tag. |
| `cancelByTags` | `tags: JobTag[]` | `Promise<void>` | Cancels all jobs with any of the specified tags. |

### Configuration Functions

| Function | Description |
| :--- | :--- |
| `configurePostgresQueue(config?: PostgresQueueModuleConfig)` | Configures the module to use a PostgreSQL backend. |
| `configureMongoQueue(config: MongoRepositoryConfig<MongoJob>)` | Configures the module to use a MongoDB backend. |
