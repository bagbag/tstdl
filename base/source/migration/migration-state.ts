import type { Entity, NewEntity } from '#/database';

export type MigrationState = Entity & {
  name: string,
  revision: number
};

export type NewMigrationState = NewEntity<MigrationState>;
