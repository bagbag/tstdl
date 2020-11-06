import { currentTimestamp } from '@tstdl/base/utils';
import type { Entity, EntityWithoutId, EntityWithPartialId, MaybeNewEntity, NewEntity } from '@tstdl/database';
import type { ProjectedEntity, Projection } from '../base-repository';
import { ProjectionMode } from '../base-repository';
import { getNewDocumentId } from '../id';

export type MongoDocument<T extends EntityWithPartialId> = Omit<T, 'id'> & {
  _id: string
};

export type MongoDocumentWithPartialId<T extends EntityWithPartialId> = Omit<T, 'id'> & {
  _id?: string
};

export type MongoDocumentWithoutId<T extends EntityWithPartialId> = Omit<T, 'id'>;

export function toEntity<T extends Entity>(document: MongoDocument<T>): T {
  const { _id, ...entityRest } = document;

  const entity: T = {
    id: _id,
    ...entityRest
  } as any as T;

  return entity;
}

export function toEntityWithoutId<T extends MaybeNewEntity>(entity: T): EntityWithoutId<T> {
  const { id, ...rest } = entity;
  return rest;
}

export function toNewEntity<T extends MaybeNewEntity>(entity: T): NewEntity<T> {
  const { id, created, updated, deleted, ...rest } = entity;
  return rest;
}

export function toProjectedEntity<T extends Entity, M extends ProjectionMode, P extends Projection<T, M>>(document: MongoDocumentWithPartialId<T>): ProjectedEntity<T, M, P> {
  const { _id, ...documentRest } = document;

  const partialIdObject = (_id != undefined) ? { id: _id } : {};

  const entity: ProjectedEntity<T, M, P> = {
    ...partialIdObject,
    ...documentRest
  } as ProjectedEntity<T, M, P>;

  return entity;
}

export function toMongoProjection<T extends Entity, M extends ProjectionMode, P extends Projection<T, M>>(mode: M, projection: P): Projection<MongoDocument<T>, M> {
  const { id, ...projectionRest } = projection;

  const partialIdObject = (id != undefined) ? { _id: id } : (mode == ProjectionMode.Include) ? { _id: false } : {};

  const mongoProjection: Projection<MongoDocument<T>, M> = {
    ...partialIdObject,
    ...projectionRest
  } as Projection<MongoDocument<T>, M>;

  return mongoProjection;
}

export function toMongoDocument<T extends Entity>(entity: T): MongoDocument<T> {
  return renameIdPropertyToUnderscoreId(entity);
}

export function toMongoDocumentWithPartialId<T extends EntityWithPartialId>(entity: T): MongoDocumentWithPartialId<T> {
  return renameIdPropertyToUnderscoreId(entity);
}

export function toMongoDocumentWithoutId<T extends Entity>(entity: EntityWithPartialId<T>): MongoDocumentWithoutId<T> {
  const { id, ...entityRest } = entity; // eslint-disable-line @typescript-eslint/no-unused-vars

  const document: MongoDocumentWithoutId<T> = {
    ...entityRest
  } as MongoDocumentWithoutId<T>;

  return document;
}

export function toMongoDocumentWithId<T extends Entity>(entity: EntityWithPartialId<T>): MongoDocument<T> {
  const { id, ...entityRest } = entity;

  const document = {
    _id: id ?? getNewDocumentId(),
    ...entityRest
  } as MongoDocument<T>;

  return document;
}

export function mongoDocumentFromMaybeNewEntity<T extends Entity>(entity: MaybeNewEntity<T>): MongoDocument<T> {
  const { id, created, updated, deleted, ...entityRest } = entity;

  const document = {
    _id: id ?? getNewDocumentId(),
    created: created ?? currentTimestamp(),
    updated: updated ?? false,
    deleted: deleted ?? false,
    ...entityRest
  } as MongoDocument<T>;

  return document;
}

export function renameIdPropertyToUnderscoreId<T extends { id: any }>(object: T): Omit<T, 'id'> & { _id: T['id'] };
export function renameIdPropertyToUnderscoreId<T extends { id?: any }>(object: T): Omit<T, 'id'> & { _id?: T['id'] };
export function renameIdPropertyToUnderscoreId<T extends { id?: any }>(object: T): Omit<T, 'id'> & { _id?: T['id'] } {
  const { id, ...rest } = object;

  const partialIdObject = (id != undefined) ? { _id: id } : {};

  const document = {
    ...partialIdObject,
    ...rest
  };

  return document;
}
