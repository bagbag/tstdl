import { EntityRepository } from '../entity-repository';
import { DatabaseMigrationState } from './database-migration-state';

export interface DatabaseMigrationStateRepository extends EntityRepository<DatabaseMigrationState> {
  loadByName(name: string): Promise<DatabaseMigrationState | undefined>;
  setRevision(name: string, revision: number): Promise<void>;
}
