export type Entity = {
  id: string
};

export type NewEntity<T extends Entity | MaybeNewEntity = Entity> = Omit<T, 'id'>;
export type MaybeNewEntity<T extends Entity = Entity> = NewEntity<T> & { id?: string };
