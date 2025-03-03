import type { Entity } from './entity.js';

export function getEntityMap<T extends Entity>(entities: T[]): Map<string, T> {
  return new Map(entities.map((entity) => [entity.id, entity]));
}

export function getEntityIds<T extends Entity>(entities: T[]): string[] {
  return entities.map((entity) => entity.id);
}
