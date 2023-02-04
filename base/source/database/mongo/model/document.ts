import type { Entity, MaybeNewEntity, NewEntity } from '#/database';
import { getNewId } from '#/database';
import { isDefined } from '#/utils/type-guards';
import type { OptionalId, OptionalUnlessRequiredId, WithId } from 'mongodb';
import type { ProjectedEntity, Projection } from '../mongo-base.repository';
import { ProjectionMode } from '../mongo-base.repository';

export type MongoDocument<T extends MaybeNewEntity> = OptionalUnlessRequiredId<Omit<T, 'id'> & { _id: T['id'] }>;

export type MongoDocumentWithPartialId<T extends MaybeNewEntity> = OptionalId<Omit<T, 'id'> & { _id?: T['id'] }>;

export type MongoDocumentWithoutId<T extends MaybeNewEntity> = Omit<T, 'id'>;

export function toEntity<T extends Entity>(document: WithId<MongoDocument<T>> | MongoDocument<T>): T {
  const { _id, ...entityRest } = document;

  const entity: T = {
    id: _id,
    ...entityRest
  } as any as T;

  return entity;
}

export function toNewEntity<T extends MaybeNewEntity>(entity: T): NewEntity<T> {
  const { id, ...rest } = entity;
  return rest as NewEntity<T>;
}

export function toProjectedEntity<T extends Entity, M extends ProjectionMode, P extends Projection<T, M>>(document: MongoDocument<T> | MongoDocumentWithPartialId<T>): ProjectedEntity<T, M, P> {
  const { _id, ...documentRest } = document;

  const partialIdObject = (_id != undefined) ? { id: _id } : undefined;

  const entity: ProjectedEntity<T, M, P> = {
    ...partialIdObject,
    ...documentRest as object
  } as ProjectedEntity<T, M, P>;

  return entity;
}

export function toMongoProjection<T extends Entity, M extends ProjectionMode, P extends Projection<T, M>>(mode: M, projection: P): Projection<MongoDocument<T>, M> {
  const { id, ...projectionRest } = projection;

  const partialIdObject = (id != undefined) ? { _id: id } : (mode == ProjectionMode.Include) ? { _id: false } : undefined;

  const mongoProjection: Projection<MongoDocument<T>, M> = {
    ...partialIdObject,
    ...projectionRest
  } as Projection<MongoDocument<T>, M>;

  return mongoProjection;
}

export function toMongoDocument<T extends Entity>(entity: T): MongoDocument<T> {
  return renameIdPropertyToUnderscoreId(entity) as MongoDocument<T>;
}

export function toMongoDocumentWithPartialId<T extends MaybeNewEntity>(entity: T): MongoDocumentWithPartialId<T> {
  return renameIdPropertyToUnderscoreId(entity) as MongoDocumentWithPartialId<T>;
}

export function toMongoDocumentWithoutId<T extends Entity>(entity: MaybeNewEntity<T>): MongoDocumentWithoutId<T> {
  const { id, ...entityRest } = entity; // eslint-disable-line @typescript-eslint/no-unused-vars

  const document: MongoDocumentWithoutId<T> = {
    ...entityRest
  } as MongoDocumentWithoutId<T>;

  return document;
}

export function mongoDocumentFromMaybeNewEntity<T extends Entity>(entity: MaybeNewEntity<T>): MongoDocument<T> {
  const { id, ...entityRest } = entity;

  const document = {
    _id: id ?? getNewId(),
    ...entityRest
  } as MongoDocument<T>;

  return document;
}

export function renameIdPropertyToUnderscoreId<T extends { id: any }>(object: T): Omit<T, 'id'> & { _id: T['id'] };
export function renameIdPropertyToUnderscoreId<T extends { id?: any }>(object: T): Omit<T, 'id'> & { _id?: T['id'] };
export function renameIdPropertyToUnderscoreId<T extends { id?: any }>(object: T): Omit<T, 'id'> & { _id?: T['id'] } {
  const { id, ...rest } = object;

  const partialIdObject = isDefined(id) ? { _id: id } : undefined;

  const document = {
    ...partialIdObject,
    ...rest
  };

  return document;
}
