/**
 * @module
 * Defines base entity classes and related types for the ORM.
 */
import { Defaulted, Integer } from '#/schema/index.js';
import type { Type } from '#/types/index.js';
import { PrimaryKey } from './decorators.js';
import { Embedded, type HasDefault, type IsPrimaryKey, Json, Timestamp, Uuid } from './types.js';

/**
 * Represents the type (constructor) of an entity, potentially holding an entity name.
 * @template T - The entity class type.
 */
export interface EntityType<T extends Entity | EntityWithoutMetadata = Entity | EntityWithoutMetadata> extends Type<T> {
  readonly entityName?: string;
}

export type AnyEntity = Entity | EntityWithoutMetadata;

/**
 * Base class for extensible metadata attributes associated with an entity.
 * Allows storing arbitrary key-value pairs.
 */
@Json()
export abstract class EntityMetadataAttributes { // eslint-disable-line @typescript-eslint/no-extraneous-class
  [key: string]: unknown;
}

/**
 * Base class defining common metadata fields for entities, such as revision tracking and timestamps.
 */
export abstract class EntityMetadata {
  @Integer()
  revision: number;

  @Timestamp()
  revisionTimestamp: Timestamp;

  @Timestamp()
  createTimestamp: Timestamp;

  @Timestamp({ nullable: true })
  deleteTimestamp: Timestamp | null;

  @Defaulted(EntityMetadataAttributes, {})
  attributes: HasDefault<Json<EntityMetadataAttributes>>;
}

/**
 * Abstract base class for entities that include standard metadata.
 * Provides a default `id` (UUID primary key) and an `metadata` field.
 */
export abstract class Entity {
  @PrimaryKey()
  @Uuid({ defaultRandom: true })
  id: IsPrimaryKey<HasDefault<Uuid>>;

  @Embedded(EntityMetadata, { prefix: null })
  metadata: Embedded<EntityMetadata>;
}

/**
 * Abstract base class for entities that do *not* include the standard metadata fields.
 * Provides only a default `id` (UUID primary key). Useful for simpler tables or join tables.
 */
export abstract class EntityWithoutMetadata {
  @PrimaryKey()
  @Uuid({ defaultRandom: true })
  id: IsPrimaryKey<HasDefault<Uuid>>;
}
