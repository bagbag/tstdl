/* eslint-disable @typescript-eslint/semi */
import { Entity, EntityRepository, EntityWithPartialId, UpdateOptions } from '@tstdl/database';
import { MongoBaseRepository } from './base-repository';
import { Collection, TypedIndexSpecification } from './types';

type Options<T> = {
  indexes?: TypedIndexSpecification<T>[]
}

export type EntityTransformer<T extends Entity, TDb extends Entity> = {
  transform: (item: T) => TDb,
  untransform: (item: TDb) => T
}

export const noopTransformer: EntityTransformer<any, any> = {
  transform: (item: unknown) => item,
  untransform: (item: unknown) => item
}

export function getNoopTransformer<T extends Entity = any>(): EntityTransformer<T, T> {
  return noopTransformer;
}

export class MongoEntityRepository<T extends Entity, TDb extends Entity = T> implements EntityRepository<T> {
  _type: T;

  /* eslint-disable @typescript-eslint/member-ordering */
  protected readonly collection: Collection<TDb>;
  protected readonly indexes?: TypedIndexSpecification<TDb>[];
  protected readonly baseRepository: MongoBaseRepository<TDb>;
  protected readonly transformer: EntityTransformer<T, TDb>;
  /* eslint-enable @typescript-eslint/member-ordering */

  constructor(collection: Collection<TDb>, transformer: EntityTransformer<T, TDb>, { indexes }: Options<TDb> = {}) {
    this.collection = collection;
    this.transformer = transformer;
    this.indexes = indexes;

    this.baseRepository = new MongoBaseRepository(collection);
  }

  async initialize(): Promise<void> {
    if (this.indexes != undefined && this.indexes.length > 0) {
      await this.baseRepository.createIndexes(this.indexes);
    }
  }

  async load<U extends T = T>(id: string): Promise<U> {
    const entity = await this.baseRepository.load(id);
    return this.transformer.untransform(entity) as U;
  }

  async tryLoad<U extends T = T>(id: string): Promise<U | undefined> {
    const entity = await this.baseRepository.tryLoad(id);
    return entity == undefined ? undefined : this.transformer.untransform(entity) as U;
  }

  async loadMany<U extends T = T>(ids: string[]): Promise<U[]> {
    const entities = await this.baseRepository.loadManyById(ids);
    return entities.map((entity) => this.transformer.untransform(entity) as U);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U> {
    for await (const entity of this.baseRepository.loadManyByIdWithCursor(ids)) {
      yield this.transformer.untransform(entity) as U;
    }
  }

  async loadAll<U extends T = T>(): Promise<U[]> {
    const entities = await this.baseRepository.loadManyByFilter({});
    return entities.map((entity) => this.transformer.untransform(entity) as U);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *loadAllCursor<U extends T = T>(): AsyncIterableIterator<U> {
    for await (const entity of this.baseRepository.loadManyByFilterWithCursor({})) {
      yield this.transformer.untransform(entity) as U;
    }
  }

  async loadAndDelete<U extends T = T>(id: string): Promise<U> {
    const entity = await this.baseRepository.loadAndDelete(id);
    return this.transformer.untransform(entity) as U;
  }

  async tryLoadAndDelete<U extends T = T>(id: string): Promise<U | undefined> {
    const entity = await this.baseRepository.tryLoadAndDelete(id);
    return entity == undefined ? undefined : this.transformer.untransform(entity) as U;
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

  async count(allowEstimation: boolean = false): Promise<number> {
    return this.baseRepository.countByFilter({}, { estimate: allowEstimation });
  }

  async insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U> {
    const transformed = this.transformer.transform(entity as any as T);
    const insertedEntity = await this.baseRepository.insert(transformed);
    return this.transformer.untransform(insertedEntity) as U;
  }

  async insertMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]> {
    const transformed = entities.map((entity) => this.transformer.transform(entity as any as T));
    const insertedEntities = await this.baseRepository.insertMany(transformed);
    return insertedEntities.map((insertedEntity) => this.transformer.untransform(insertedEntity) as U)
  }

  async update<U extends T>(entity: U, options?: UpdateOptions): Promise<U> {
    const transformed = this.transformer.transform(entity as any as T);
    const replacedEntity = await this.baseRepository.replace(transformed, options);
    return this.transformer.untransform(replacedEntity) as U;
  }

  async updateMany<U extends T>(entities: U[], options?: UpdateOptions): Promise<U[]> {
    const transformed = entities.map((entity) => this.transformer.transform(entity as any as T));
    const replacedEntities = await this.baseRepository.replaceMany(transformed, options);
    return replacedEntities.map((insertedEntity) => this.transformer.untransform(insertedEntity) as U)
  }

  async delete<U extends T>(entity: U): Promise<boolean> {
    return this.baseRepository.deleteById(entity.id);
  }

  async deleteMany<U extends T>(entities: U[]): Promise<number> {
    const ids = entities.map((entity) => entity.id);
    return this.baseRepository.deleteManyById(ids);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.baseRepository.deleteById(id);
  }

  async deleteManyById(ids: string[]): Promise<number> {
    return this.baseRepository.deleteManyById(ids);
  }
}
