import { Entity, EntityRepository, EntityWithPartialId } from '@tstdl/database';
import { MongoBaseRepository } from './base-repository';
import { Collection, TypedIndexSpecification } from './types';

type Options<T> = {
  indexes?: TypedIndexSpecification<T>[]
}

export class MongoEntityRepository<T extends Entity> implements EntityRepository<T> {
  _type: T;

  protected readonly collection: Collection<T>;
  protected readonly indexes?: TypedIndexSpecification<T>[];
  protected readonly baseRepository: MongoBaseRepository<T>;

  constructor(collection: Collection<T>, { indexes }: Options<T> = {}) {
    this.collection = collection;
    this.indexes = indexes;

    this.baseRepository = new MongoBaseRepository(collection);
  }

  async initialize(): Promise<void> {
    if (this.indexes != undefined && this.indexes.length > 0) {
      await this.baseRepository.createIndexes(this.indexes);
    }
  }

  async load<U extends T = T>(id: string, throwIfNotFound?: true): Promise<U>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean): Promise<U | undefined>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean = true): Promise<U | undefined> {
    return this.baseRepository.load(id, throwIfNotFound) as Promise<U>;
  }

  async loadMany<U extends T = T>(ids: string[]): Promise<U[]> {
    return this.baseRepository.loadManyById<U>(ids);
  }

  async *loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U> {
    yield* this.baseRepository.loadManyByIdWithCursor<U>(ids);
  }

  async save<U extends T>(entity: EntityWithPartialId<U>, upsert: boolean = false): Promise<U> {
    if (entity.id == undefined) {
      return this.baseRepository.insert(entity);
    }
    else {
      return this.baseRepository.replace(entity, upsert);
    }
  }

  async saveMany<U extends T>(entities: EntityWithPartialId<U>[], upsert: boolean = false): Promise<U[]> {
    return this.baseRepository.insertOrReplace(entities, upsert);
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
