/* eslint-disable @typescript-eslint/semi */
import { Entity, EntityRepository, EntityWithPartialId, UpdateOptions } from '@tstdl/database';
import { MongoBaseRepository } from './base-repository';
import { MongoDocument } from './model';
import { Collection, TypedIndexSpecification } from './types';

type Options<T> = {
  indexes?: TypedIndexSpecification<T>[]
}

export class MongoEntityRepository<T extends Entity> implements EntityRepository<T> {
  _type: T;

  /* eslint-disable @typescript-eslint/member-ordering */
  protected readonly collection: Collection<MongoDocument<T>>;
  protected readonly indexes?: TypedIndexSpecification<T>[];
  protected readonly baseRepository: MongoBaseRepository<T>;
  /* eslint-enable @typescript-eslint/member-ordering */

  constructor(collection: Collection<MongoDocument<T>>, { indexes }: Options<T> = {}) {
    this.collection = collection;
    this.indexes = indexes;

    this.baseRepository = new MongoBaseRepository(collection);
  }

  async initialize(): Promise<void> {
    if (this.indexes != undefined && this.indexes.length > 0) {
      await this.baseRepository.createIndexes(this.indexes);
    }
  }

  async load<U extends T = T>(id: string): Promise<U> {
    return this.baseRepository.load(id);
  }

  async tryLoad<U extends T = T>(id: string): Promise<U | undefined> {
    return this.baseRepository.tryLoad(id);
  }

  async loadMany<U extends T = T>(ids: string[]): Promise<U[]> {
    return this.baseRepository.loadManyById<U>(ids);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U> {
    yield* this.baseRepository.loadManyByIdWithCursor<U>(ids);
  }

  async loadAndDelete<U extends T = T>(id: string): Promise<U> {
    return this.baseRepository.loadAndDelete(id);
  }

  async tryLoadAndDelete<U extends T = T>(id: string): Promise<U | undefined> {
    return this.baseRepository.tryLoadAndDelete(id);
  }

  async has(id: string): Promise<boolean> {
    return this.baseRepository.has(id);
  }

  async hasMany(ids: string[]): Promise<string[]> {
    return this.baseRepository.hasMany(ids);
  }

  async hasAll(ids: string[]): Promise<boolean> {
    return this.baseRepository.hasAll(ids);
  }

  async insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U> {
    return this.baseRepository.insert(entity);
  }

  async insertMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]> {
    return this.baseRepository.insertMany(entities);
  }

  async update<U extends T>(entity: U, options?: UpdateOptions): Promise<U> {
    return this.baseRepository.replace(entity, options?.upsert ?? false);
  }

  async updateMany<U extends T>(entities: U[], options?: UpdateOptions): Promise<U[]> {
    return this.baseRepository.replaceMany(entities, options?.upsert ?? false);
  }

  async delete<U extends T>(entity: U): Promise<boolean> {
    return this.baseRepository.delete(entity);
  }

  async deleteMany<U extends T>(entities: U[]): Promise<number> {
    return this.baseRepository.deleteMany(entities);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.baseRepository.deleteById(id);
  }

  async deleteManyById(ids: string[]): Promise<number> {
    return this.baseRepository.deleteManyById(ids);
  }
}
