import type { EntityRepository } from '#/database';
import type { MigrationState } from './migration-state';

export interface MigrationStateRepository extends EntityRepository<MigrationState> { }
