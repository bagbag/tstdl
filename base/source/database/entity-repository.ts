import type { Entity, MaybeNewEntity } from './entity';
import type { Query, QueryOptions } from './query';

export declare const repositoryType: unique symbol;

export type UpdateOptions = {
  upsert?: boolean
};

export type EntityPatch<T extends Entity = Entity> = Partial<Omit<T, 'id'>>;

export abstract class EntityRepository<T extends Entity = Entity> {
  readonly [repositoryType]: T;

  abstract load<U extends T = T>(id: string): Promise<U>;
  abstract tryLoad<U extends T = T>(id: string): Promise<U | undefined>;
  abstract loadByFilter<U extends T = T>(query: Query<U>, options?: QueryOptions<U>): Promise<U>;
  abstract tryLoadByFilter<U extends T = T>(query: Query<U>, options?: QueryOptions<U>): Promise<U | undefined>;
  abstract loadMany<U extends T = T>(ids: string[], options?: QueryOptions<U>): Promise<U[]>;
  abstract loadManyCursor<U extends T = T>(ids: string[], options?: QueryOptions<U>): AsyncIterableIterator<U>;
  abstract loadManyByFilter<U extends T = T>(query: Query<U>, options?: QueryOptions<U>): Promise<U[]>;
  abstract loadManyByFilterCursor<U extends T = T>(query: Query<U>, options?: QueryOptions<U>): AsyncIterableIterator<U>;
  abstract loadAll<U extends T = T>(options?: QueryOptions<U>): Promise<U[]>;
  abstract loadAllCursor<U extends T = T>(options?: QueryOptions<U>): AsyncIterableIterator<U>;

  abstract loadAndDelete<U extends T = T>(id: string): Promise<U>;
  abstract tryLoadAndDelete<U extends T = T>(id: string): Promise<U | undefined>;
  abstract loadByFilterAndDelete<U extends T = T>(query: Query<U>, options?: QueryOptions<U>): Promise<U>;
  abstract tryLoadByFilterAndDelete<U extends T = T>(query: Query<U>, options?: QueryOptions<U>): Promise<U | undefined>;

  abstract loadAndPatch<U extends T = T>(id: string, patch: EntityPatch<U>, includePatch: boolean): Promise<U>;
  abstract tryLoadAndPatch<U extends T = T>(id: string, patch: EntityPatch<U>, includePatch: boolean): Promise<U | undefined>;
  abstract loadByFilterAndPatch<U extends T = T>(query: Query<U>, patch: EntityPatch<U>, includePatch: boolean, options?: QueryOptions<U>): Promise<U>;
  abstract tryLoadByFilterAndPatch<U extends T = T>(query: Query<U>, patch: EntityPatch<U>, includePatch: boolean, options?: QueryOptions<U>): Promise<U | undefined>;

  abstract count(allowEstimation?: boolean): Promise<number>;
  abstract countByFilter<U extends T>(query: Query<U>, allowEstimation?: boolean): Promise<number>;

  abstract has(id: string): Promise<boolean>;
  abstract hasByFilter<U extends T>(query: Query<U>): Promise<boolean>;
  abstract hasMany(ids: string[]): Promise<string[]>;
  abstract hasAll(ids: string[]): Promise<boolean>;

  abstract insert<U extends T>(entity: MaybeNewEntity<U>): Promise<U>;
  abstract insertMany<U extends T>(entities: MaybeNewEntity<U>[]): Promise<U[]>;

  abstract insertIfNotExists<U extends T>(entity: MaybeNewEntity<U>): Promise<U | undefined>;
  abstract insertIfNotExistsByFilter<U extends T>(query: Query<U>, entity: MaybeNewEntity<U>): Promise<U | undefined>;

  abstract update<U extends T>(entity: U, options?: UpdateOptions): Promise<boolean>;
  abstract updateMany<U extends T>(entities: U[], options?: UpdateOptions): Promise<number>;

  abstract patch<U extends T = T>(entity: U, patch: EntityPatch<U>): Promise<boolean>;
  abstract patchMany<U extends T = T>(entities: U[], patch: EntityPatch<U>): Promise<number>;
  abstract patchByFilter<U extends T = T>(query: Query<U>, patch: EntityPatch<U>): Promise<boolean>;
  abstract patchManyByFilter<U extends T = T>(query: Query<U>, patch: EntityPatch<U>): Promise<number>;

  abstract delete<U extends T>(entity: U): Promise<boolean>;
  abstract deleteMany<U extends T>(entities: U[]): Promise<number>;
  abstract deleteById(id: string): Promise<boolean>;
  abstract deleteManyById(ids: string[]): Promise<number>;
  abstract deleteByFilter<U extends T = T>(query: Query<U>): Promise<boolean>;
  abstract deleteManyByFilter<U extends T = T>(query: Query<U>): Promise<number>;
}
