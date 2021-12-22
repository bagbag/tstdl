import { EntityRepository } from '#/database';
import type { MigrationState } from './migration-state';

export abstract class MigrationStateRepository extends EntityRepository<MigrationState> { }
