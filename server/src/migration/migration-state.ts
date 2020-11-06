import type { Entity, NewEntity } from '@tstdl/database';

export type MigrationState = Entity & {
  name: string,
  revision: number
};

export type NewMigrationState = NewEntity<MigrationState>;
