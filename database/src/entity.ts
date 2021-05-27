import type { PartialProperty } from '@tstdl/base/types';

export type Entity = {
  id: string
};

export type MaybeNewEntity<T extends Entity = Entity> = PartialProperty<T, 'id'>;
export type NewEntity<T extends Entity | MaybeNewEntity = Entity> = Omit<T, 'id'>;
