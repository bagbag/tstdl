import { Entity, EntityWithPartialId } from './entity';

export type UpdateOptions = {
  upsert: boolean
};

export interface EntityRepository<T extends Entity> {
  _type: T;

  load<U extends T = T>(id: string, throwIfNotFound?: true): Promise<U>;
  load<U extends T = T>(id: string, throwIfNotFound: boolean): Promise<U | undefined>;
  loadMany<U extends T = T>(ids: string[]): Promise<U[]>;
  loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U>;

  has(id: string): Promise<boolean>;
  hasMany(ids: string[]): Promise<string[]>;
  hasAll(ids: string[]): Promise<boolean>;

  insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U>;
  insertMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]>;

  update<U extends T>(entity: U, options: UpdateOptions): Promise<U>;
  updateMany<U extends T>(entities: U[], options: UpdateOptions): Promise<U[]>;

  delete<U extends T>(entity: U): Promise<boolean>;
  deleteMany<U extends T>(entities: U[]): Promise<number>;
  deleteById(id: string): Promise<boolean>;
  deleteManyById(ids: string[]): Promise<number>;
}
