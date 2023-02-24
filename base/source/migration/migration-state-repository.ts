import { EntityRepository } from '#/database/index.js';
import type { MigrationState } from './migration-state.js';

export abstract class MigrationStateRepository extends EntityRepository<MigrationState> { }
