import { Entity, EntityWithPartialId } from './entity';

export interface EntityRepository<T extends Entity> {
  _type: T;

  load<U extends T = T>(id: string, throwIfNotFound?: true): Promise<U>;
  load<U extends T = T>(id: string, throwIfNotFound: boolean): Promise<U | undefined>;
  loadMany<U extends T = T>(ids: string[]): Promise<U[]>;
  loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U>;

  save<U extends T>(entity: EntityWithPartialId<U>): Promise<U>;
  saveMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]>;

  delete<U extends T>(entity: U): Promise<boolean>;
  deleteMany<U extends T>(entities: U[]): Promise<number>;
  deleteById(id: string): Promise<boolean>;
  deleteManyById(ids: string[]): Promise<number>;
}
