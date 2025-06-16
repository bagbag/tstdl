/**
 * @module
 * Defines types used by ORM repositories for operations like loading, updating, and creating entities.
 * Includes types for ordering, loading options, and entity data structures for create/update operations.
 */
import type { Paths, Record, TypedOmit } from '#/types.js';
import type { UntaggedDeep } from '#/types/tagged.js';
import type { SQL, SQLWrapper } from 'drizzle-orm';
import type { PartialDeep } from 'type-fest';
import type { Entity, EntityMetadata, EntityWithoutMetadata } from './entity.js';

type WithSql<T> = { [P in keyof T]: T[P] extends Record ? WithSql<T[P]> : (T[P] | SQL) };

/**
 * Specifies the target column (e.g. for ordering, distinct on), which can be a property path within the entity
 * or a raw Drizzle SQLWrapper for a complex target.
 * @template T - The entity type.
 */
export type TargetColumnPaths<T extends EntityWithoutMetadata> = Paths<UntaggedDeep<T>>;

/**
 * Specifies the target column (e.g. for ordering, distinct on), which can be a property path within the entity
 * or a raw Drizzle SQLWrapper for a complex target.
 * @template T - The entity type.
 */
export type TargetColumn<T extends EntityWithoutMetadata> = TargetColumnPaths<T> | SQLWrapper;

/** Specifies the direction for ordering results ('asc' or 'desc'). */
export type OrderDirection = 'asc' | 'desc';

/**
 * Defines how results should be ordered. Can be a single target, an array of targets
 * (optionally with direction), or an object mapping property paths to directions.
 * @template T - The entity type.
 */
export type Order<T extends EntityWithoutMetadata> = TargetColumn<T> | (TargetColumn<T> | [TargetColumn<T>, OrderDirection])[] | Partial<Record<Exclude<TargetColumn<T>, SQLWrapper>, OrderDirection>>;

/**
 * Options object containing ordering configuration.
 * @template T - The entity type.
 */
export type OrderOptions<T extends EntityWithoutMetadata> = { order?: Order<T> };

/**
 * Options for loading a single entity, including ordering and offset.
 * @template T - The entity type.
 */
export type LoadOptions<T extends EntityWithoutMetadata> = OrderOptions<T> & { offset?: number };
/**
 * Options for loading multiple entities, including ordering, offset, and limit.
 * @template T - The entity type.
 */
export type LoadManyOptions<T extends EntityWithoutMetadata> = LoadOptions<T> & { limit?: number, distinct?: boolean | TargetColumn<T>[] };

/**
 * Options for update operations (currently inherits from LoadOptions, primarily for ordering).
 * @template T - The entity type.
 */
export type UpdateOptions<T extends EntityWithoutMetadata> = LoadOptions<T>;

/** Type definition for updating entity metadata attributes, allowing partial updates and SQL expressions. */
export type EntityMetadataUpdate = WithSql<Partial<UntaggedDeep<Pick<EntityMetadata, 'attributes'>>>>;

export type EntityMetadataInsert = Partial<Pick<EntityMetadata, 'attributes'>>;

/**
 * Represents the data structure for creating a new entity.
 * Excludes 'id' and 'metadata' by default, but allows providing an optional 'id' and partial 'metadata.attributes'.
 * Allows SQL expressions for values.
 * @template T - The entity type.
 */
export type NewEntity<T extends Entity | EntityWithoutMetadata> = T extends Entity
  ? WithSql<UntaggedDeep<TypedOmit<T, 'id' | 'metadata'> & { id?: string, metadata?: EntityMetadataInsert }>>
  : WithSql<UntaggedDeep<TypedOmit<T, 'id'> & { id?: string }>>;

/**
 * Represents the data structure for updating an existing entity.
 * Allows partial updates for all properties (using PartialDeep) and specific updates for 'metadata.attributes'.
 * Allows SQL expressions for values.
 * @template T - The entity type.
 */
export type EntityUpdate<T extends EntityWithoutMetadata> = T extends Entity
  ? WithSql<PartialDeep<UntaggedDeep<TypedOmit<T, 'metadata'>>>> & { metadata?: EntityMetadataUpdate }
  : WithSql<PartialDeep<UntaggedDeep<T>>>;
