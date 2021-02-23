import type { Entity } from '@tstdl/database';

export type KeyValue<T = unknown> = Entity & {
  scope: string,
  key: string,
  value: T
};
