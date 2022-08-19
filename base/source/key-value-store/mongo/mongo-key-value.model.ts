import type { Entity } from '#/database';

export type MongoKeyValue<T = unknown> = Entity & {
  module: string,
  key: string,
  value: T,
  updated: number
};
