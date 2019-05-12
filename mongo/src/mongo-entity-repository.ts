import { AsyncEnumerable } from '@common-ts/base/enumerable';
import { Entity, EntityRepository, EntityWithPartialId } from '@common-ts/database';
import { IndexSpecification } from 'mongodb';
import { MongoBaseRepository } from './mongo-base-repository';
import { Collection } from './types';

export class MongoEntityRepository<T extends Entity> implements EntityRepository<T> {
  protected readonly collection: Collection<T>;
  protected readonly indexes: IndexSpecification[];
  protected readonly baseRepository: MongoBaseRepository<T>;

  constructor(collection: Collection<T>, indexes: IndexSpecification[] = []) {
    this.collection = collection;
    this.indexes = indexes;

    this.baseRepository = new MongoBaseRepository(collection);
  }

  async initialize(): Promise<void> {
    if (this.indexes.length > 0) {
      await this.collection.createIndexes(this.indexes);
    }
  }

  async load<U extends T = T>(id: string, throwIfNotFound?: true): Promise<U>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean): Promise<U | undefined>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean = true): Promise<U | undefined> {
    return this.baseRepository.load(id, throwIfNotFound) as Promise<U>;
  }

  async loadMany<U extends T = T>(ids: string[]): Promise<U[]> {
    const iterable = this.baseRepository.loadManyById<U>(ids);
    const entities = await AsyncEnumerable.from(iterable).toArray();

    return entities;
  }

  async *loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U> {
    yield* this.baseRepository.loadManyById<U>(ids);
  }

  async save<U extends T>(entity: EntityWithPartialId<U>): Promise<U> {
    return this.baseRepository.insert(entity);
  }

  async saveMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]> {
    return this.baseRepository.insertMany(entities);
  }
}