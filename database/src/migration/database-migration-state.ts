import { Entity } from '../entity';

export type DatabaseMigrationState = Entity & {
  entity: string,
  revision: number
};
