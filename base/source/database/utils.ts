import type { Entity } from './entity.js';

export function getEntityMap<T extends Entity>(entities: T[]): Map<string, T> {
  return new Map(entities.map((entity) => [entity.id, entity]));
}
