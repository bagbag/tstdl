import type { Entity } from '@tstdl/database';

export type MigrationState = Entity & {
  name: string,
  revision: number
};
