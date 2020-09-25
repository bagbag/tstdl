import type { EntityRepository } from '@tstdl/database';
import type { MigrationState } from './migration-state';

export interface MigrationStateRepository extends EntityRepository<MigrationState> {
  loadByName(name: string): Promise<MigrationState | undefined>;
  setRevision(name: string, revision: number): Promise<void>;
}
