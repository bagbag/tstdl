export type Entity<Id extends string | number = string> = {
  id: Id
};

export type NewEntity<T extends Entity | MaybeNewEntity = Entity> = Omit<T, 'id'>;
export type MaybeNewEntity<T extends Entity = Entity> = NewEntity<T> & { id?: T['id'] };
