import { and, asc, eq, inArray, isNull as isSqlNull, lt, lte, or, sql } from 'drizzle-orm';
import { merge } from 'rxjs';

import { CancellationSignal } from '#/cancellation/index.js';
import { inject, injectArgument, provide, Singleton } from '#/injector/index.js';
import { MessageBus } from '#/message-bus/index.js';
import type { EntityUpdate, NewEntity } from '#/orm/index.js';
import { DatabaseConfig, EntityRepositoryConfig, injectRepository, interval, RANDOM_UUID, TRANSACTION_TIMESTAMP } from '#/orm/server/index.js';
import type { ObjectLiteral } from '#/types.js';
import { cancelableTimeout } from '#/utils/timing.js';
import { isDefined, isString } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import { defaultQueueConfig, Queue, UniqueTagStrategy, type EnqueueManyItem, type EnqueueManyOptions, type EnqueueOneOptions, type Job, type JobTag } from '../queue.js';
import { PostgresJob } from './job.model.js';
import { PostgresQueueModuleConfig } from './module.js';
import { job } from './schemas.js';

@Singleton({
  providers: [
    provide(EntityRepositoryConfig, { useValue: { schema: 'queue' } }),
    provide(DatabaseConfig, { useFactory: (_, context) => context.resolve(PostgresQueueModuleConfig).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }) })
  ]
})
export class PostgresQueue<T extends ObjectLiteral> extends Queue<T> {
  readonly #repository = injectRepository(PostgresJob);
  readonly #config = injectArgument(this);
  readonly #processTimeout = (isString(this.#config) ? undefined : this.#config.processTimeout) ?? defaultQueueConfig.processTimeout;
  readonly #maxTries = (isString(this.#config) ? undefined : this.#config.maxTries) ?? defaultQueueConfig.maxTries;
  readonly #queueName = isString(this.#config) ? this.#config : this.#config.name;
  readonly #messageBus = inject(MessageBus<void>, `PostgresQueue:${this.#queueName}`);

  readonly #keepOldUpdate = { id: sql`${job.id}` } satisfies EntityUpdate<PostgresJob>;

  readonly #takeNewUpdate = {
    id: RANDOM_UUID,
    queue: this.#queueName,
    priority: sql`excluded.priority`,
    tag: sql`excluded.tag`,
    tries: 0,
    enqueueTimestamp: TRANSACTION_TIMESTAMP,
    lastDequeueTimestamp: null,
    data: sql`excluded.data`
  } satisfies EntityUpdate<PostgresJob>;

  readonly #dequeueQuery = and(
    eq(job.queue, this.#queueName),
    lt(job.tries, this.#maxTries),
    or(
      isSqlNull(job.lastDequeueTimestamp),
      lte(sql`${job.lastDequeueTimestamp} + ${interval(this.#processTimeout, 'milliseconds')}`, TRANSACTION_TIMESTAMP)
    )
  );

  readonly #dequeueUpdate = {
    tries: sql`${job.tries} + 1`,
    lastDequeueTimestamp: TRANSACTION_TIMESTAMP
  };

  override async enqueue(data: T, options?: EnqueueOneOptions): Promise<Job<T>> {
    const jobs = await this.enqueueMany([{ data, tag: options?.tag, priority: options?.priority }], { uniqueTag: options?.uniqueTag, returnJobs: true });
    return jobs[0]!;
  }

  override async enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions & { returnJobs?: false }): Promise<void>;
  override async enqueueMany(items: EnqueueManyItem<T>[], options: EnqueueManyOptions & { returnJobs: true }): Promise<Job<T>[]>;
  override async enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions): Promise<Job<T>[] | undefined>;
  override async enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions): Promise<void | Job<T>[]> {
    const newEntities = items.map((item) => ({
      queue: this.#queueName,
      priority: item.priority ?? 1000,
      tag: item.tag ?? null,
      tries: 0,
      enqueueTimestamp: TRANSACTION_TIMESTAMP,
      lastDequeueTimestamp: null,
      data: item.data
    } satisfies NewEntity<PostgresJob>));

    const update = (options?.uniqueTag == UniqueTagStrategy.TakeNew)
      ? this.#takeNewUpdate
      : this.#keepOldUpdate;

    const jobs = await this.#repository.upsertMany(['queue', 'tag'], newEntities, update);
    this.#messageBus.publishAndForget();

    return jobs;
  }

  override async has(id: string): Promise<boolean> {
    return this.#repository.hasByQuery({ queue: this.#queueName, id });
  }

  override async countByTag(tag: JobTag): Promise<number> {
    return this.#repository.countByQuery({ queue: this.#queueName, tag });
  }

  override async get(id: string): Promise<Job<T> | undefined> {
    return this.#repository.tryLoadByQuery({ queue: this.#queueName, id });
  }

  override async getByTag(tag: JobTag): Promise<Job<T>[]> {
    return this.#repository.loadManyByQuery({ queue: this.#queueName, tag });
  }

  override async cancel(id: string): Promise<void> {
    await this.#repository.hardDeleteByQuery({ queue: this.#queueName, id });
  }

  override async cancelMany(ids: string[]): Promise<void> {
    await this.#repository.hardDeleteManyByQuery({ queue: this.#queueName, id: { $in: ids } });
  }

  override async cancelByTag(tag: JobTag): Promise<void> {
    await this.#repository.hardDeleteByQuery({ queue: this.#queueName, tag });
  }

  override async cancelByTags(tags: JobTag[]): Promise<void> {
    await this.#repository.hardDeleteManyByQuery({ queue: this.#queueName, tag: { $in: tags } });
  }

  override async dequeue(): Promise<Job<T> | undefined> {
    const jobs = await this.dequeueMany(1);

    if (jobs.length == 0) {
      return undefined;
    }

    return jobs[0]!;
  }

  override async dequeueMany(count: number): Promise<Job<T>[]> {
    const rows = await this.#repository.session
      .update(job)
      .set(this.#dequeueUpdate)
      .where(
        inArray(
          job.id,
          this.#repository.session
            .select({ id: job.id })
            .from(job)
            .where(this.#dequeueQuery)
            .orderBy(asc(job.priority), asc(job.enqueueTimestamp), asc(job.lastDequeueTimestamp), asc(job.tries))
            .limit(count)
            .for('update')
        )
      )
      .returning();

    return this.#repository.$mapManyToEntity(rows as any[]); // eslint-disable-line @typescript-eslint/no-unsafe-argument
  }

  override async acknowledge(job: Job<T>): Promise<void> {
    return this.cancel(job.id);
  }

  override async acknowledgeMany(jobs: Job<T>[]): Promise<void> {
    const ids = jobs.map((job) => job.id);
    return this.cancelMany(ids);
  }

  override async *getConsumer(cancellationSignal: CancellationSignal): AsyncIterableIterator<Job<T>> {
    const continue$ = merge(this.#messageBus.allMessages$, cancellationSignal);

    while (cancellationSignal.isUnset) {
      const job = await this.dequeue();

      if (isDefined(job)) {
        yield job;
        continue;
      }

      await cancelableTimeout(5 * millisecondsPerSecond, continue$);
    }
  }

  override async *getBatchConsumer(size: number, cancellationSignal: CancellationSignal): AsyncIterableIterator<Job<T>[]> {
    const continue$ = merge(this.#messageBus.allMessages$, cancellationSignal);

    while (cancellationSignal.isUnset) {
      const jobs = await this.dequeueMany(size);

      if (jobs.length > 0) {
        yield jobs;
        continue;
      }

      await cancelableTimeout(5 * millisecondsPerSecond, continue$);
    }
  }
}
