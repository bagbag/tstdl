import { Entity, EntityWithPartialId } from './entity';

export interface EntityRepository<T extends Entity> {
  load<U extends T = T>(id: string): Promise<U>;
  loadMany<U extends T = T>(ids: string[]): Promise<U[]>;
  loadManyCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U>;

  save<U extends T>(entity: EntityWithPartialId<U>): Promise<U>;
  saveMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]>;
}
