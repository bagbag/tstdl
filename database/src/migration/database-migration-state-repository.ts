import { EntityRepository } from '../entity-repository';
import { DatabaseMigrationState } from './database-migration-state';

export interface DatabaseMigrationStateRepository extends EntityRepository<DatabaseMigrationState> {
  loadByEntity(entity: string): Promise<DatabaseMigrationState | undefined>;
  setRevision(entity: string, revision: number): Promise<void>;
}
