import { NumberProperty, Property, any, record } from '#/schema/index.js';
import type { Record, Type, TypedOmit } from '#/types.js';
import { PrimaryKey } from './decorators.js';
import { type HasDefault, type IsPrimaryKey, Uuid } from './types.js';

export interface EntityType<T extends Entity = Entity> extends Type<T> {
  readonly entityName: string;
}

export abstract class EntityMetadata {
  @NumberProperty()
  revision: number;

  @NumberProperty()
  revisionTimestamp: number;

  @NumberProperty()
  createTimestamp: number;

  @NumberProperty({ nullable: true })
  deleteTimestamp: number | null;

  @Property(record(any(), any()))
  attributes: Record;
}

export abstract class Entity {
  @PrimaryKey()
  @Uuid({ defaultRandom: true })
  id: IsPrimaryKey<HasDefault<Uuid>>;

  // @Property(EntityMetadata)
  metadata: EntityMetadata;
}

export type NewEntity<T extends Entity> = TypedOmit<T, 'id' | 'metadata'> & { id?: string, metadata?: Partial<Pick<EntityMetadata, 'attributes'>> };
