import type { Entity, MaybeNewEntity } from './entity';

export type UpdateOptions = {
  upsert?: boolean
};

export type EntityFilter<T extends Entity> = { [P in keyof Omit<T, 'created' | 'updated' | 'deleted'>]?: T[P] | T[P][] };
export type EntityPatch<T extends Entity> = Partial<Omit<T, 'id' | 'created' | 'updated' | 'deleted'>>;

export interface EntityRepository<T extends Entity> {
  readonly _type: T;

  load<U extends T = T>(id: string, includeDeleted?: boolean): Promise<U>;
  tryLoad<U extends T = T>(id: string, includeDeleted?: boolean): Promise<U | undefined>;
  loadByFilter<U extends T = T>(filter: EntityFilter<U>, includeDeleted?: boolean): Promise<U>;
  tryLoadByFilter<U extends T = T>(filter: EntityFilter<U>, includeDeleted?: boolean): Promise<U | undefined>;
  loadMany<U extends T = T>(ids: string[], includeDeleted?: boolean): Promise<U[]>;
  loadManyCursor<U extends T = T>(ids: string[], includeDeleted?: boolean): AsyncIterableIterator<U>;
  loadManyByFilter<U extends T = T>(filter: EntityFilter<U>, includeDeleted?: boolean): Promise<U[]>;
  loadManyByFilterCursor<U extends T = T>(filter: EntityFilter<U>, includeDeleted?: boolean): AsyncIterableIterator<U>;
  loadAll<U extends T = T>(includeDeleted?: boolean): Promise<U[]>;
  loadAllCursor<U extends T = T>(includeDeleted?: boolean): AsyncIterableIterator<U>;

  loadAndDelete<U extends T = T>(id: string, physically: boolean, includeDeleted?: boolean): Promise<U>;
  tryLoadAndDelete<U extends T = T>(id: string, physically: boolean, includeDeleted?: boolean): Promise<U | undefined>;
  loadByFilterAndDelete<U extends T = T>(filter: EntityFilter<T>, physically: boolean, includeDeleted?: boolean): Promise<U>;
  tryLoadByFilterAndDelete<U extends T = T>(filter: EntityFilter<T>, physically: boolean, includeDeleted?: boolean): Promise<U | undefined>;

  loadAndPatch<U extends T = T>(id: string, patch: EntityPatch<U>, includePatch: boolean, includeDeleted?: boolean): Promise<U>;
  tryLoadAndPatch<U extends T = T>(id: string, patch: EntityPatch<U>, includePatch: boolean, includeDeleted?: boolean): Promise<U | undefined>;
  loadByFilterAndPatch<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includePatch: boolean, includeDeleted?: boolean): Promise<U>;
  tryLoadByFilterAndPatch<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includePatch: boolean, includeDeleted?: boolean): Promise<U | undefined>;

  count(includeDeleted?: boolean, allowEstimation?: boolean): Promise<number>;
  countByFilter<U extends T>(filter: EntityFilter<U>, includeDeleted?: boolean, allowEstimation?: boolean): Promise<number>;

  has(id: string, includeDeleted?: boolean): Promise<boolean>;
  hasByFilter<U extends T>(filter: EntityFilter<U>, includeDeleted?: boolean): Promise<boolean>;
  hasMany(ids: string[], includeDeleted?: boolean): Promise<string[]>;
  hasAll(ids: string[], includeDeleted?: boolean): Promise<boolean>;

  insert<U extends T>(entity: MaybeNewEntity<U>): Promise<U>;
  insertMany<U extends T>(entities: MaybeNewEntity<U>[]): Promise<U[]>;

  update<U extends T>(entity: U, includeDeleted?: boolean, options?: UpdateOptions): Promise<boolean>;
  updateMany<U extends T>(entities: U[], includeDeleted?: boolean, options?: UpdateOptions): Promise<number>;

  patch<U extends T = T>(entity: U, patch: EntityPatch<U>, includeDeleted?: boolean): Promise<boolean>;
  patchMany<U extends T = T>(entities: U[], patch: EntityPatch<U>, includeDeleted?: boolean): Promise<number>;
  patchByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includeDeleted?: boolean): Promise<boolean>;
  patchManyByFilter<U extends T = T>(filter: EntityFilter<U>, patch: EntityPatch<U>, includeDeleted?: boolean): Promise<number>;

  delete<U extends T>(entity: U, physically: boolean): Promise<boolean>;
  deleteMany<U extends T>(entities: U[], physically: boolean): Promise<number>;
  deleteById(id: string, physically: boolean): Promise<boolean>;
  deleteByFilter(filter: EntityFilter<T>, physically: boolean): Promise<boolean>;
  deleteManyByFilter(filter: EntityFilter<T>, physically: boolean): Promise<number>;

  undelete<U extends T>(entity: U): Promise<boolean>;
  undeleteMany<U extends T>(entities: U[]): Promise<number>;
  undeleteById(id: string): Promise<boolean>;
  undeleteByFilter(filter: EntityFilter<T>): Promise<boolean>;
  undeleteManyByFilter(filter: EntityFilter<T>): Promise<number>;
}
