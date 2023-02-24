import type { Entity } from '#/database/index.js';

export type MongoKeyValue<T = unknown> = Entity & {
  module: string,
  key: string,
  value: T,
  updated: number
};
