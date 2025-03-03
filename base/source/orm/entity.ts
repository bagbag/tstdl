import { Defaulted, Integer } from '#/schema/index.js';
import type { Type } from '#/types.js';
import { PrimaryKey } from './decorators.js';
import { Embedded, type HasDefault, type IsPrimaryKey, Json, Timestamp, Uuid } from './types.js';

export interface EntityType<T extends Entity | EntityWithoutMetadata = Entity | EntityWithoutMetadata> extends Type<T> {
  readonly entityName?: string;
}

@Json()
export abstract class EntityMetadataAttributes { // eslint-disable-line @typescript-eslint/no-extraneous-class
  [key: string]: unknown;
}

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

export abstract class Entity {
  @PrimaryKey()
  @Uuid({ defaultRandom: true })
  id: IsPrimaryKey<HasDefault<Uuid>>;

  @Embedded(EntityMetadata, { prefix: null })
  metadata: Embedded<EntityMetadata>;
}

export abstract class EntityWithoutMetadata {
  @PrimaryKey()
  @Uuid({ defaultRandom: true })
  id: IsPrimaryKey<HasDefault<Uuid>>;
}
