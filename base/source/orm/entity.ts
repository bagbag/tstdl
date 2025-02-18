import { Defaulted, Integer } from '#/schema/index.js';
import type { Type, TypedOmit } from '#/types.js';
import type { UntaggedDeep } from '#/types/index.js';
import { Index, PrimaryKey } from './decorators.js';
import { Embedded, type HasDefault, type IsPrimaryKey, Json, Timestamp, Uuid } from './types.js';

export interface EntityType<T extends Entity = Entity> extends Type<T> {
  readonly entityName?: string;
}

export type NewEntity<T extends Entity> = UntaggedDeep<TypedOmit<T, 'id' | 'metadata'> & { id?: string, metadata?: Partial<Pick<EntityMetadata, 'attributes'>> }>;

@Json()
export abstract class EntityMetadataAttributes { // eslint-disable-line @typescript-eslint/no-extraneous-class
  [key: string]: unknown;
}

@Index(undefined, ['revision', 'revisionTimestamp'])
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
