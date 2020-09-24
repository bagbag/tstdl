/* eslint-disable @typescript-eslint/semi */
import type { Logger } from '@tstdl/base/logger';
import { equals } from '@tstdl/base/utils';
import type { Entity, EntityFilter, EntityPatch, EntityRepository, EntityWithPartialId, UpdateOptions } from '@tstdl/database';
import { MongoBaseRepository } from './base-repository';
import type { MongoDocument } from './model';
import { toMongoDocumentWithPartialId } from './model';
import type { Collection, FilterQuery, TypedIndexSpecification, UpdateQuery } from './types';

type MongoEntityRepositoryOptions<T extends Entity> = {
  logger: Logger,
  entityName?: string,
  indexes?: TypedIndexSpecification<T>[]
}

export type EntityTransformer<T extends Entity, TDb extends Entity> = {
  transform: (item: T) => TDb,
  untransform: (item: TDb) => T,
  filterTransform: (item: EntityFilter<T>) => EntityFilter<TDb>,
  patchTransform: (item: EntityPatch<T>) => EntityPatch<TDb>
}

export const noopTransformerFunction = (item: any): any => item;

export const noopTransformer: EntityTransformer<any, any> = {
  transform: noopTransformerFunction,
  untransform: noopTransformerFunction,
  filterTransform: noopTransformerFunction,
  patchTransform: noopTransformerFunction
}

export function getNoopTransformer<T extends Entity = any>(): EntityTransformer<T, T> {
  return noopTransformer;
}

export class MongoEntityRepository<T extends Entity, TDb extends Entity = T> implements EntityRepository<T> {
  _type: T;

  /* eslint-disable @typescript-eslint/member-ordering */
  protected readonly collection: Collection<TDb>;
  protected readonly logger: Logger;
  protected readonly indexes: TypedIndexSpecification<TDb>[];
  protected readonly baseRepository: MongoBaseRepository<TDb>;
  protected readonly transformer: EntityTransformer<T, TDb>;
  /* eslint-enable @typescript-eslint/member-ordering */

  constructor(collection: Collection<TDb>, transformer: EntityTransformer<T, TDb>, { logger, indexes, entityName }: MongoEntityRepositoryOptions<TDb>) {
    this.collection = collection;
    this.logger = logger.prefix(`${collection.collectionName}: `);
    this.indexes = indexes ?? [];
    this.transformer = transformer;

    this.baseRepository = new MongoBaseRepository(collection, { entityName });
  }

  async initialize(): Promise<void> {
    const existingRawIndexes = await this.collection.indexes() as (TypedIndexSpecification<any> & { v: number })[];
    const existingIndexes = existingRawIndexes.map(normalizeIndex).filter((index) => index.name != '_id_');

    const hasIndexWithoutName = this.indexes.some((index) => index.name == undefined);

    if (hasIndexWithoutName) {
      throw new Error('indexes are required to have names');
    }

    const unwantedIndexes = existingIndexes.filter((existingIndex) => !this.indexes.some((index) => equals(existingIndex, normalizeIndex(index), { deep: true, sortArray: false })));
    const requiredIndexes = this.indexes.filter((wantedIndex) => !existingIndexes.some((index) => equals(normalizeIndex(wantedIndex), index, { deep: true, sortArray: false })));

    for (const unwantedIndex of unwantedIndexes) {
      this.logger.warn(`dropping index ${unwantedIndex.name as string}`);
      await this.collection.dropIndex(unwantedIndex.name as string);
    }

    if (requiredIndexes.length > 0) {
      const indexNames = requiredIndexes.map((index, i) => index.name ?? `unnamed${i}`);
      this.logger.warn(`creating indexes ${indexNames.join(', ')}`);
      await this.baseRepository.createIndexes(requiredIndexes);
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

  async loadByFilter<U extends T = T>(filter: EntityFilter<U>): Promise<U> {
    const transformedFilter = this.transformFilter(filter);
    const entity = await this.baseRepository.loadByFilter(transformedFilter);
    return this.transformer.untransform(entity) as U;
  }

  async tryLoadByFilter<U extends T = T>(filter: EntityFilter<U>): Promise<U | undefined> {
    const transformedFilter = this.transformFilter(filter);
    const entity = await this.baseRepository.tryLoadByFilter(transformedFilter);
    return entity == undefined ? undefined : this.transformer.untransform(entity) as U;
  }

  async loadManyByFilter<U extends T = T>(filter: EntityFilter<U>): Promise<U[]> {
    const transformedFilter = this.transformFilter(filter);
    const entities = await this.baseRepository.loadManyByFilter(transformedFilter);
    return entities.map(this.transformer.untransform) as U[];
  }

  async* loadManyByFilterCursor<U extends T = T>(filter: EntityFilter<U>): AsyncIterableIterator<U> {
    const transformedFilter = this.transformFilter(filter);

    for await (const entity of this.baseRepository.loadManyByFilterWithCursor(transformedFilter)) {
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

  async hasByFilter<U extends T>(filter: EntityFilter<U>): Promise<boolean> {
    const transformedFilter = this.transformFilter(filter);
    return this.baseRepository.hasByFilter(transformedFilter);
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

  async countByFilter<U extends T>(filter: EntityFilter<U>): Promise<number> {
    const transformedFilter = this.transformFilter(filter);
    return this.baseRepository.countByFilter(transformedFilter);
  }

  async patch<U extends T = T>(entity: U, patch: EntityPatch<U>): Promise<boolean> {
    const transformedPatch = this.transformPatch(patch);

    const { matchedCount } = await this.baseRepository.update({ _id: entity.id } as FilterQuery<TDb>, transformedPatch);
    return matchedCount > 0;
  }

  async patchMany<U extends T = T>(entities: U[], patch: EntityPatch<U>): Promise<number> {
    const transformedPatch = this.transformPatch(patch);
    const entityIds = entities.map((entity) => entity.id);

    const { matchedCount } = await this.baseRepository.updateMany({ _id: { $in: entityIds } } as FilterQuery<TDb>, transformedPatch);
    return matchedCount;
  }

  async patchByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>): Promise<boolean> {
    const transformedFilter = this.transformFilter(filter);
    const transformedPatch = this.transformPatch(patch);

    const { matchedCount } = await this.baseRepository.update(transformedFilter, transformedPatch);
    return matchedCount > 0;
  }

  async patchManyByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>): Promise<number> {
    const transformedFilter = this.transformFilter(filter);
    const transformedPatch = this.transformPatch(patch);

    const { matchedCount } = await this.baseRepository.updateMany(transformedFilter, transformedPatch);
    return matchedCount;
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

  async update<U extends T>(entity: U, options?: UpdateOptions): Promise<boolean> {
    const transformed = this.transformer.transform(entity as any as T);
    return this.baseRepository.replace(transformed, options);
  }

  async updateMany<U extends T>(entities: U[], options?: UpdateOptions): Promise<number> {
    const transformed = entities.map((entity) => this.transformer.transform(entity as any as T));
    return this.baseRepository.replaceMany(transformed, options);
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

  private transformFilter<U extends T = T>(filter: EntityFilter<U>): FilterQuery<TDb> {
    return toMongoDocumentWithPartialId(this.transformer.filterTransform(filter));
  }

  private transformPatch<U extends T = T>(patch: EntityPatch<U>): UpdateQuery<TDb> {
    const transformedPatch = toMongoDocumentWithPartialId(this.transformer.patchTransform(patch)) as MongoDocument<TDb>;
    return { $set: transformedPatch };
  }
}

function normalizeIndex(index: TypedIndexSpecification<any> & { v?: any }): TypedIndexSpecification<any> {
  const { v, background, ...indexRest } = index;
  return indexRest;
}
