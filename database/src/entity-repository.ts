import type { Entity, EntityWithoutId, EntityWithPartialId } from './entity';

export type UpdateOptions = {
  upsert?: boolean
};

export type EntityFilter<T extends Entity> = Partial<T>;
export type EntityPatch<T extends Entity> = Partial<EntityWithoutId<T>>;

export interface EntityRepository<T extends Entity> {
  _type: T;

  load<U extends T = T>(id: string): Promise<U>;
  tryLoad<U extends T = T>(id: string): Promise<U | undefined>;

  loadByFilter<U extends T = T>(filter: EntityFilter<U>): Promise<U>;
  tryLoadByFilter<U extends T = T>(filter: EntityFilter<U>): Promise<U | undefined>;

  loadMany<U extends T = T>(ids: string[]): Promise<U[]>;
  loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U>;

  loadManyByFilter<U extends T = T>(filter: EntityFilter<U>): Promise<U[]>;
  loadManyByFilterCursor<U extends T = T>(filter: EntityFilter<U>): AsyncIterableIterator<U>;

  loadAll<U extends T = T>(): Promise<U[]>;
  loadAllCursor<U extends T = T>(): AsyncIterableIterator<U>;

  loadAndDelete<U extends T = T>(id: string): Promise<U>;
  tryLoadAndDelete<U extends T = T>(id: string): Promise<U | undefined>;

  count(allowEstimation?: boolean): Promise<number>;
  countByFilter<U extends T>(filter: EntityFilter<U>): Promise<number>;

  has(id: string): Promise<boolean>;
  hasByFilter<U extends T>(filter: EntityFilter<U>): Promise<boolean>;
  hasMany(ids: string[]): Promise<string[]>;
  hasAll(ids: string[]): Promise<boolean>;

  insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U>;
  insertMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]>;

  update<U extends T>(entity: U, options?: UpdateOptions): Promise<boolean>;
  updateMany<U extends T>(entities: U[], options?: UpdateOptions): Promise<number>;

  patch<U extends T = T>(entity: U, patch: EntityPatch<U>): Promise<boolean>;
  patchMany<U extends T = T>(entities: U[], patch: EntityPatch<U>): Promise<number>;

  patchByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>): Promise<boolean>;
  patchManyByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>): Promise<number>;

  delete<U extends T>(entity: U): Promise<boolean>;
  deleteMany<U extends T>(entities: U[]): Promise<number>;
  deleteById(id: string): Promise<boolean>;
  deleteManyById(ids: string[]): Promise<number>;
}
