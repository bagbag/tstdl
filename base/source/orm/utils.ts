/**
 * @module
 * Provides utility functions for working with ORM entities.
 */
import type { Entity, EntityWithoutMetadata } from './entity.js';

/**
 * Converts an array of entities into a Map keyed by entity ID.
 * @template T - The entity type, must extend `Entity` (i.e., have an `id` property).
 * @param entities - An array of entities.
 * @returns A Map where keys are entity IDs and values are the corresponding entities.
 */
export function getEntityMap<T extends Entity | EntityWithoutMetadata>(entities: T[]): Map<string, T> {
  return new Map(entities.map((entity) => [entity.id, entity]));
}

/**
 * Extracts the IDs from an array of entities.
 * @template T - The entity type, must extend `Entity` (i.e., have an `id` property).
 * @param entities - An array of entities.
 * @returns An array containing the IDs of the entities.
 */
export function getEntityIds(entities: (Entity | EntityWithoutMetadata)[]): string[] {
  return entities.map((entity) => entity.id);
}
