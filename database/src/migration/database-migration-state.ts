import { Entity } from '../entity';

export type DatabaseMigrationState = Entity & {
  name: string,
  revision: number
};
