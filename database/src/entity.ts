import type { PartialProperty } from '@tstdl/base/types';

export type Entity = {
  id: string,
  created: number,
  updated: number | undefined,
  deleted: number | undefined
};

export type MaybeNewEntity<T extends Entity = Entity> = PartialProperty<T, 'id' | 'created' | 'updated' | 'deleted'>;
export type NewEntity<T extends Entity | MaybeNewEntity = Entity> = Omit<T, 'id' | 'created' | 'updated' | 'deleted'>;

export type EntityWithPartialId<T extends Entity = Entity> = PartialProperty<T, 'id'>;
export type EntityWithoutId<T extends Entity | EntityWithPartialId = Entity> = Omit<T, 'id'>;
