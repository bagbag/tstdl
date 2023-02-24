import type { Entity, NewEntity } from '#/database/index.js';

export type MigrationState = Entity & {
  name: string,
  revision: number
};

export type NewMigrationState = NewEntity<MigrationState>;
