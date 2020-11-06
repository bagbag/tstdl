/* eslint-disable @typescript-eslint/semi */
import type { Logger } from '@tstdl/base/logger';
import { currentTimestamp, equals } from '@tstdl/base/utils';
import type { Entity, EntityFilter, EntityPatch, EntityRepository, MaybeNewEntity, UpdateOptions } from '@tstdl/database';
import { getBasicFilterQuery, MongoBaseRepository } from './base-repository';
import { renameIdPropertyToUnderscoreId } from './model';
import type { Collection, FilterQuery, TypedIndexSpecification, UpdateQuery } from './types';

type MongoEntityRepositoryOptions<T extends Entity> = {
  logger: Logger,
  entityName?: string,
  indexes?: TypedIndexSpecification<T>[]
}

export type EntityTransformer<T extends Entity, TDb extends Entity> = {
  transform: (item: MaybeNewEntity<T>) => MaybeNewEntity<TDb>,
  untransform: (item: TDb) => T,
  filterTransform: (item: EntityFilter<T>) => EntityFilter<TDb>,
  patchTransform: (item: EntityPatch<T>) => EntityPatch<TDb>
}

export const noopTransformerFunction = <T>(item: T): T => item;

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
  readonly _type: T;

  /* eslint-disable @typescript-eslint/member-ordering */
  readonly collection: Collection<TDb>;
  readonly logger: Logger;
  readonly indexes: TypedIndexSpecification<TDb>[];
  readonly baseRepository: MongoBaseRepository<TDb>;
  readonly transformer: EntityTransformer<T, TDb>;
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

    const indexesWithoutName = this.indexes.filter((index) => index.name == undefined);

    if (indexesWithoutName.length > 0) {
      for (const index of indexesWithoutName) {
        this.logger.error(`missing name for index ${JSON.stringify(index)}`);
      }

      throw new Error(`indexes are required to have names (collection: ${this.collection.collectionName}, entity-name: ${this.baseRepository.entityName})`);
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

  async load<U extends T = T>(id: string, includeDeleted: boolean = false): Promise<U> {
    const entity = await this.baseRepository.load(id, includeDeleted);
    return this.transformer.untransform(entity) as U;
  }

  async tryLoad<U extends T = T>(id: string, includeDeleted: boolean = false): Promise<U | undefined> {
    const entity = await this.baseRepository.tryLoad(id, includeDeleted);
    return entity == undefined ? undefined : this.transformer.untransform(entity) as U;
  }

  async loadMany<U extends T = T>(ids: string[], includeDeleted: boolean = false): Promise<U[]> {
    const entities = await this.baseRepository.loadManyById(ids, includeDeleted);
    return entities.map((entity) => this.transformer.untransform(entity) as U);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *loadManyCursor<U extends T = T>(ids: string[], includeDeleted: boolean = false): AsyncIterableIterator<U> {
    for await (const entity of this.baseRepository.loadManyByIdWithCursor(ids, includeDeleted)) {
      yield this.transformer.untransform(entity) as U;
    }
  }

  async loadByFilter<U extends T = T>(filter: EntityFilter<U>, includeDeleted: boolean = false): Promise<U> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const entity = await this.baseRepository.loadByFilter(transformedFilter);
    return this.transformer.untransform(entity) as U;
  }

  async tryLoadByFilter<U extends T = T>(filter: EntityFilter<U>, includeDeleted: boolean = false): Promise<U | undefined> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const entity = await this.baseRepository.tryLoadByFilter(transformedFilter);
    return entity == undefined ? undefined : this.transformer.untransform(entity) as U;
  }

  async loadManyByFilter<U extends T = T>(filter: EntityFilter<U>, includeDeleted: boolean = false): Promise<U[]> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const entities = await this.baseRepository.loadManyByFilter(transformedFilter);
    return entities.map(this.transformer.untransform) as U[];
  }

  async* loadManyByFilterCursor<U extends T = T>(filter: EntityFilter<U>, includeDeleted: boolean = false): AsyncIterableIterator<U> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);

    for await (const entity of this.baseRepository.loadManyByFilterWithCursor(transformedFilter)) {
      yield this.transformer.untransform(entity) as U;
    }
  }

  async loadAll<U extends T = T>(includeDeleted: boolean = false): Promise<U[]> {
    const filter = getBasicFilterQuery({ includeDeleted });

    const entities = await this.baseRepository.loadManyByFilter(filter);
    return entities.map((entity) => this.transformer.untransform(entity) as U);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *loadAllCursor<U extends T = T>(includeDeleted: boolean = false): AsyncIterableIterator<U> {
    const filter = getBasicFilterQuery({ includeDeleted });

    for await (const entity of this.baseRepository.loadManyByFilterWithCursor(filter)) {
      yield this.transformer.untransform(entity) as U;
    }
  }

  async loadAndDelete<U extends T = T>(id: string, physically: boolean, includeDeleted: boolean = false): Promise<U> {
    return this.loadByFilterAndDelete({ id } as EntityFilter<U>, physically, includeDeleted);
  }

  async tryLoadAndDelete<U extends T = T>(id: string, physically: boolean, includeDeleted: boolean = false): Promise<U | undefined> {
    return this.tryLoadByFilterAndDelete({ id } as EntityFilter<U>, physically, includeDeleted);
  }

  async loadByFilterAndDelete<U extends T = T>(filter: EntityFilter<T>, physically: boolean, includeDeleted: boolean = false): Promise<U> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const entity = await this.baseRepository.loadByFilterAndDelete(transformedFilter, physically);
    return this.transformer.untransform(entity) as U;
  }

  async tryLoadByFilterAndDelete<U extends T = T>(filter: EntityFilter<T>, physically: boolean, includeDeleted: boolean = false): Promise<U | undefined> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const entity = await this.baseRepository.tryLoadByFilterAndDelete(transformedFilter, physically);
    return entity == undefined ? undefined : this.transformer.untransform(entity) as U;
  }

  async loadAndPatch<U extends T = T>(id: string, patch: EntityPatch<U>, includePatch: boolean, includeDeleted: boolean = false): Promise<U> {
    return this.loadByFilterAndPatch({ id } as EntityFilter<U>, patch, includePatch, includeDeleted);
  }

  async tryLoadAndPatch<U extends T = T>(id: string, patch: EntityPatch<U>, includePatch: boolean, includeDeleted: boolean = false): Promise<U | undefined> {
    return this.tryLoadByFilterAndPatch({ id } as EntityFilter<U>, patch, includePatch, includeDeleted);
  }

  async loadByFilterAndPatch<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includePatch: boolean, includeDeleted: boolean = false): Promise<U> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const update = this.transformPatch(patch);
    const entity = await this.baseRepository.loadByFilterAndUpdate(transformedFilter, update, { returnOriginal: !includePatch });

    return this.transformer.untransform(entity) as U;
  }

  async tryLoadByFilterAndPatch<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includePatch: boolean, includeDeleted: boolean = false): Promise<U | undefined> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const update = this.transformPatch(patch);
    const entity = await this.baseRepository.tryLoadByFilterAndUpdate(transformedFilter, update, { returnOriginal: !includePatch });

    return entity == undefined ? undefined : this.transformer.untransform(entity) as U;
  }

  async has(id: string, includeDeleted: boolean = false): Promise<boolean> {
    return this.baseRepository.has(id, includeDeleted);
  }

  async hasByFilter<U extends T>(filter: EntityFilter<U>, includeDeleted: boolean = false): Promise<boolean> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    return this.baseRepository.hasByFilter(transformedFilter);
  }

  async hasMany(ids: string[], includeDeleted: boolean = false): Promise<string[]> {
    return this.baseRepository.hasMany(ids, includeDeleted);
  }

  async hasAll(ids: string[], includeDeleted: boolean = false): Promise<boolean> {
    return this.baseRepository.hasAll(ids, includeDeleted);
  }

  async count(includeDeleted: boolean = false, allowEstimation: boolean = false): Promise<number> {
    const filter = getBasicFilterQuery({ includeDeleted });
    return this.baseRepository.countByFilter(filter, { estimate: allowEstimation });
  }

  async countByFilter<U extends T>(filter: EntityFilter<U>, includeDeleted: boolean = false, allowEstimation: boolean = false): Promise<number> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    return this.baseRepository.countByFilter(transformedFilter, { estimate: allowEstimation });
  }

  async patch<U extends T = T>(entity: U, patch: EntityPatch<U>, includeDeleted: boolean = false): Promise<boolean> {
    const transformedPatch = this.transformPatch(patch);
    const filter = getBasicFilterQuery({ ids: entity.id, includeDeleted });

    const { matchedCount } = await this.baseRepository.update(filter, transformedPatch);
    return matchedCount > 0;
  }

  async patchMany<U extends T = T>(entities: U[], patch: EntityPatch<U>, includeDeleted: boolean = false): Promise<number> {
    const transformedPatch = this.transformPatch(patch);
    const ids = entities.map((entity) => entity.id);
    const filter = getBasicFilterQuery({ ids, includeDeleted });

    const { matchedCount } = await this.baseRepository.updateMany(filter, transformedPatch);
    return matchedCount;
  }

  async patchByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includeDeleted: boolean = false): Promise<boolean> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const transformedPatch = this.transformPatch(patch);

    const { matchedCount } = await this.baseRepository.update(transformedFilter, transformedPatch);
    return matchedCount > 0;
  }

  async patchManyByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includeDeleted: boolean = false): Promise<number> {
    const transformedFilter = this.transformFilter(filter, includeDeleted);
    const transformedPatch = this.transformPatch(patch);

    const { matchedCount } = await this.baseRepository.updateMany(transformedFilter, transformedPatch);
    return matchedCount;
  }

  async insert<U extends T>(entity: MaybeNewEntity<U>): Promise<U> {
    const transformed = this.transformer.transform(entity as any as T);
    const insertedEntity = await this.baseRepository.insert(transformed);
    return this.transformer.untransform(insertedEntity) as U;
  }

  async insertMany<U extends T>(entities: MaybeNewEntity<U>[]): Promise<U[]> {
    const transformed = entities.map((entity) => this.transformer.transform(entity as any as T));
    const insertedEntities = await this.baseRepository.insertMany(transformed);
    return insertedEntities.map((insertedEntity) => this.transformer.untransform(insertedEntity) as U)
  }

  async update<U extends T>(entity: U, includeDeleted: boolean = false, options?: UpdateOptions): Promise<boolean> {
    const transformed = this.transformer.transform(entity as any as T) as TDb;
    return this.baseRepository.replace(transformed, includeDeleted, options);
  }

  async updateMany<U extends T>(entities: U[], includeDeleted: boolean = false, options?: UpdateOptions): Promise<number> {
    const transformed = entities.map((entity) => this.transformer.transform(entity as any as T) as TDb);
    return this.baseRepository.replaceMany(transformed, includeDeleted, options);
  }

  async delete<U extends T>(entity: U, physically: boolean): Promise<boolean> {
    return this.baseRepository.deleteById(entity.id, physically);
  }

  async deleteMany<U extends T>(entities: U[], physically: boolean): Promise<number> {
    const ids = entities.map((entity) => entity.id);
    return this.baseRepository.deleteManyById(ids, physically);
  }

  async deleteById(id: string, physically: boolean): Promise<boolean> {
    return this.baseRepository.deleteById(id, physically);
  }

  async deleteManyById(ids: string[], physically: boolean): Promise<number> {
    return this.baseRepository.deleteManyById(ids, physically);
  }

  async deleteByFilter(filter: EntityFilter<T>, physically: boolean): Promise<boolean> {
    const transformedFilter = this.transformFilter(filter, true);
    return this.baseRepository.deleteByFilter(transformedFilter, physically);
  }

  async deleteManyByFilter(filter: EntityFilter<T>, physically: boolean): Promise<number> {
    const transformedFilter = this.transformFilter(filter, true);
    return this.baseRepository.deleteManyByFilter(transformedFilter, physically);
  }

  async undelete<U extends T>(entity: U): Promise<boolean> {
    return this.baseRepository.undeleteById(entity.id);
  }

  async undeleteMany<U extends T>(entities: U[]): Promise<number> {
    const ids = entities.map((entity) => entity.id);
    return this.baseRepository.undeleteManyById(ids);
  }

  async undeleteById(id: string): Promise<boolean> {
    return this.baseRepository.undeleteById(id);
  }

  async undeleteManyById(ids: string[]): Promise<number> {
    return this.baseRepository.undeleteManyById(ids);
  }

  async undeleteByFilter(filter: EntityFilter<T>): Promise<boolean> {
    const transformedFilter = this.transformFilter(filter, true);
    return this.baseRepository.undeleteByFilter(transformedFilter);
  }

  async undeleteManyByFilter(filter: EntityFilter<T>): Promise<number> {
    const transformedFilter = this.transformFilter(filter, true);
    return this.baseRepository.undeleteManyByFilter(transformedFilter);
  }

  private transformFilter<U extends T = T>(filter: EntityFilter<U>, includeDeleted: boolean): FilterQuery<TDb> {
    const transformedFilter = this.transformer.filterTransform(filter);
    return entityFilterToFilterQuery(transformedFilter, includeDeleted);
  }

  private transformPatch<U extends T = T>(patch: EntityPatch<U>): UpdateQuery<TDb> {
    const transformedPatch = this.transformer.patchTransform(patch);
    return { $set: { updated: (currentTimestamp() as Entity['deleted']), ...transformedPatch } } as UpdateQuery<TDb>;
  }
}

function normalizeIndex(index: TypedIndexSpecification<any> & { v?: any, ns?: any }): TypedIndexSpecification<any> {
  const { v, background, ns, ...indexRest } = index;
  return indexRest;
}

export function entityFilterToFilterQuery<T extends Entity>(filter: EntityFilter<T>, includeDeleted: boolean): FilterQuery<T> {
  const filterQuery: FilterQuery<T> = {};

  Object.entries(renameIdPropertyToUnderscoreId(filter)).forEach(([property, value]) => {
    const property2 = property == 'id' ? '_id' : property;
    filterQuery[property2 as keyof typeof filterQuery] = Array.isArray(value) ? { $in: value } : { $eq: value };
  });

  if (!includeDeleted) {
    filterQuery.deleted = { $eq: undefined };
  }

  return filterQuery;
}
