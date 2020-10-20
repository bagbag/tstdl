import type { Entity } from '@tstdl/database';

export type KeyValue<T = unknown> = Entity & {
  module: string,
  key: string,
  value: T
};
