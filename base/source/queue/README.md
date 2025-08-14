# Queue

A robust, multi-backend queueing system for managing and processing background jobs.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Getting a Queue Instance](#getting-a-queue-instance)
  - [Enqueueing a Job](#enqueueing-a-job)
  - [Enqueueing with Options](#enqueueing-with-options)
  - [Processing Jobs (Consumer)](#processing-jobs-consumer)
  - [Batch Processing](#batch-processing)
- [API Summary](#api-summary)
  - [Class: `Queue<T>`](#class-queuet)
  - [Configuration Functions](#configuration-functions)

## Features

- **Multi-Backend Support**: Seamlessly switch between PostgreSQL and MongoDB backends.
- **Job Prioritization**: Assign priorities to jobs to ensure important tasks are processed first.
- **Unique Jobs**: Prevent duplicate jobs using tags with configurable strategies (`KeepOld` or `TakeNew`).
- **Batch Operations**: Enqueue multiple jobs in a single, efficient operation.
- **Automatic Retries**: Failed jobs are automatically retried up to a configurable number of times with exponential backoff.
- **Configurable Timeouts**: Set a processing timeout for each queue to prevent jobs from getting stuck.
- **Robust Consumer Patterns**: Easily create single-job or batch-processing workers using async iterators.
- **Transactional Safety**: Integrates with the ORM to ensure jobs are only visible after the parent transaction is committed.

## Core Concepts

### Queue

The `Queue<T>` class is the central point of interaction. Each queue is identified by a unique name and handles a specific type of job data (`T`). It provides methods for enqueueing, dequeueing, and acknowledging jobs.

### Job

A `Job` represents a single unit of work. It contains the data payload to be processed, a priority level, an optional tag for identification, and metadata such as the number of tries and timestamps.

### Provider (`QueueProvider`)

The `QueueProvider` is a factory responsible for creating `Queue` instances. This abstraction allows the system to support different storage backends. Implementations like `PostgresQueueProvider` or `MongoQueueProvider` are used to get queue instances connected to the appropriate database.

### Consumer

A consumer is a process that continuously fetches jobs from a queue and executes them. This module simplifies consumer creation by providing async iterators (`getConsumer` and `getBatchConsumer`), which can be used in a `for await...of` loop to handle job processing logic.

### Unique Tags

You can assign a `tag` (a string) to a job. When combined with a `uniqueTag` strategy, this mechanism prevents duplicate jobs from being enqueued.

- **`UniqueTagStrategy.KeepOld`**: If a job with the same tag already exists, the new job is discarded.
- **`UniqueTagStrategy.TakeNew`**: If a job with the same tag already exists, it is overwritten by the new job.

## Usage

### Configuration

First, configure the queue provider in your application's setup file. This example uses the PostgreSQL backend.

```typescript
// In your application's bootstrap file
import { configurePostgresQueue } from '@tstdl/base/queue/postgres';

// This will use the default database configuration.
// You can provide a specific database configuration if needed.
configurePostgresQueue();
```

### Getting a Queue Instance

Use the dependency injector to get an instance of a specific queue by its name.

```typescript
import { Queue } from '@tstdl/base/queue';
import { Injector } from '@tstdl/base/injector';

type SendWelcomeEmailJob = {
  userId: string;
  email: string;
};

// Get a queue named 'send-welcome-email'
const emailQueue = Injector.resolve<Queue<SendWelcomeEmailJob>>(Queue, 'send-welcome-email');
```

### Enqueueing a Job

Add a new job to the queue with the required data payload.

```typescript
await emailQueue.enqueue({
  userId: 'user-123',
  email: 'test@example.com'
});

console.log('Welcome email job enqueued.');
```

### Enqueueing with Options

You can specify options like priority, tags, and unique job strategies when enqueueing.

```typescript
import { UniqueTagStrategy } from '@tstdl/base/queue';

// This job has a high priority (lower number is higher).
// If a job with the tag 'welcome-email-user-456' already exists, it will be replaced.
await emailQueue.enqueue(
  { userId: 'user-456', email: 'another@example.com' },
  {
    priority: 100, // Default is 1000
    tag: 'welcome-email-user-456',
    uniqueTag: UniqueTagStrategy.TakeNew
  }
);
```

### Processing Jobs (Consumer)

Create a worker to process jobs from the queue. The `getConsumer` method provides an async iterator that continuously yields new jobs.

```typescript
import { CancellationSignal } from '@tstdl/base/cancellation';
import { Logger } from '@tstdl/base/logger';
import { Queue } from '@tstdl/base/queue';
import { Injector } from '@tstdl/base/injector';

// A function to simulate sending an email
async function sendWelcomeEmail(address: string): Promise<void> {
  console.log(`Sending welcome email to ${address}...`);
  // Add email sending logic here
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function startEmailWorker(cancellationSignal: CancellationSignal): Promise<void> {
  const logger = Injector.resolve(Logger);
  const emailQueue = Injector.resolve<Queue<SendWelcomeEmailJob>>(Queue, 'send-welcome-email');

  logger.info('Email worker started. Waiting for jobs...');

  for await (const job of emailQueue.getConsumer(cancellationSignal)) {
    logger.info(`Processing job ${job.id} for user ${job.data.userId}`);
    try {
      await sendWelcomeEmail(job.data.email);
      await emailQueue.acknowledge(job); // Mark the job as completed and remove it
      logger.info(`Successfully processed and acknowledged job ${job.id}`);
    }
    catch (error) {
      logger.error(`Failed to process job ${job.id}. It will be retried automatically.`, error);
      // Do not acknowledge. The job will become available for another try after the process timeout.
    }
  }

  logger.info('Email worker shutting down.');
}
```

### Batch Processing

For high-throughput scenarios, you can process jobs in batches to reduce overhead.

```typescript
async function startBatchEmailWorker(cancellationSignal: CancellationSignal): Promise<void> {
  const logger = Injector.resolve(Logger);
  const emailQueue = Injector.resolve<Queue<SendWelcomeEmailJob>>(Queue, 'send-welcome-email');

  logger.info('Batch email worker started.');

  const batchSize = 50;
  for await (const jobs of emailQueue.getBatchConsumer(batchSize, cancellationSignal)) {
    logger.info(`Processing a batch of ${jobs.length} jobs.`);
    try {
      const emailPromises = jobs.map(job => sendWelcomeEmail(job.data.email));
      await Promise.all(emailPromises);

      await emailQueue.acknowledgeMany(jobs);
      logger.info(`Successfully processed and acknowledged batch.`);
    }
    catch (error) {
      logger.error('Failed to process batch. Jobs will be retried individually later.', error);
    }
  }
}
```

## API Summary

### Class: `Queue<T>`

The main class for interacting with a queue.

| Method | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `enqueue` | `data: T`, `options?: EnqueueOneOptions` | `Promise<Job<T>>` | Adds a single job to the queue. |
| `enqueueMany` | `items: EnqueueManyItem<T>[]`, `options?: EnqueueManyOptions` | `Promise<void \| Job<T>[]>` | Adds multiple jobs to the queue. Can optionally return the created jobs. |
| `dequeue` | | `Promise<Job<T> \| undefined>` | Retrieves a single available job from the queue for processing. |
| `dequeueMany` | `count: number` | `Promise<Job<T>[]>` | Retrieves a batch of available jobs from the queue. |
| `acknowledge` | `job: Job<T>` | `Promise<void>` | Marks a job as successfully completed, removing it from the queue. |
| `acknowledgeMany`| `jobs: Job<T>[]` | `Promise<void>` | Acknowledges a batch of jobs. |
| `getConsumer` | `cancellationSignal: CancellationSignal` | `AsyncIterableIterator<Job<T>>` | Returns an async iterator that yields jobs as they become available. |
| `getBatchConsumer`| `size: number`, `cancellationSignal: CancellationSignal` | `AsyncIterableIterator<Job<T>[]>` | Returns an async iterator that yields batches of jobs. |
| `get` | `id: string` | `Promise<Job<T> \| undefined>` | Retrieves a job by its ID. |
| `getByTag` | `tag: JobTag` | `Promise<Job<T>[]>` | Retrieves all jobs with a specific tag. |
| `has` | `id: string` | `Promise<boolean>` | Checks if a job with the given ID exists. |
| `cancel` | `id: string` | `Promise<void>` | Cancels and deletes a job by its ID. |
| `cancelByTag` | `tag: JobTag` | `Promise<void>` | Cancels all jobs with a specific tag. |
| `batch` | | `QueueEnqueueBatch<T>` | Creates a batch enqueue helper for better performance. |

### Configuration Functions

| Function | Description |
| :--- | :--- |
| `configurePostgresQueue(config?: PostgresQueueModuleConfig)` | Configures the module to use a PostgreSQL backend. |
| `configureMongoQueue(config: MongoRepositoryConfig<MongoJob>)` | Configures the module to use a MongoDB backend. |