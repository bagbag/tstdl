import type { Entity } from '#/database';

export type MongoKeyValue<T = unknown> = Entity & {
  scope: string,
  key: string,
  value: T
};
