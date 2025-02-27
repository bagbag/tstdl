import type { Paths, Record, TypedOmit } from '#/types.js';
import type { UntaggedDeep } from '#/types/tagged.js';
import type { SQL, SQLWrapper } from 'drizzle-orm';
import type { PartialDeep } from 'type-fest';
import type { Entity, EntityMetadata, EntityWithoutMetadata } from './entity.js';

type WithSql<T> = { [P in keyof T]: T[P] extends Record ? WithSql<T[P]> : (T[P] | SQL) };

export type OrderDirection = 'asc' | 'desc';

export type OrderTarget<T extends EntityWithoutMetadata> = Paths<UntaggedDeep<T>> | SQLWrapper;

export type Order<T extends EntityWithoutMetadata> = OrderTarget<T> | (OrderTarget<T> | [OrderTarget<T>, OrderDirection])[] | Partial<Record<Exclude<OrderTarget<T>, SQLWrapper>, OrderDirection>>;

export type OrderOptions<T extends EntityWithoutMetadata> = { order?: Order<T> };

export type LoadOptions<T extends EntityWithoutMetadata> = OrderOptions<T> & { offset?: number }; // , withDeleted?: boolean
export type LoadManyOptions<T extends EntityWithoutMetadata> = LoadOptions<T> & { limit?: number };

export type UpdateOptions<T extends EntityWithoutMetadata> = LoadOptions<T>;

export type EntityMetadataUpdate = WithSql<Partial<UntaggedDeep<Pick<EntityMetadata, 'attributes'>>>>;

export type NewEntity<T extends Entity | EntityWithoutMetadata> = T extends Entity
  ? WithSql<UntaggedDeep<TypedOmit<T, 'id' | 'metadata'> & { id?: string, metadata?: Partial<Pick<EntityMetadata, 'attributes'>> }>>
  : WithSql<UntaggedDeep<TypedOmit<T, 'id'> & { id?: string }>>;

export type EntityUpdate<T extends EntityWithoutMetadata> = T extends Entity
  ? WithSql<PartialDeep<UntaggedDeep<TypedOmit<T, 'metadata'>>>> & { metadata?: EntityMetadataUpdate }
  : WithSql<PartialDeep<UntaggedDeep<T>>>;
