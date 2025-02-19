import type { PoolConfig } from 'pg';

import { Injector } from '#/injector/injector.js';
import { isDefined } from '#/utils/type-guards.js';
import { EntityRepositoryConfig } from './repository.js';

export abstract class OrmModuleOptions {
  connection?: string | PoolConfig;
  repositoryConfig?: EntityRepositoryConfig;
}

export function configureOrm(options: OrmModuleOptions): void {
  Injector.register(OrmModuleOptions, { useValue: options });

  if (isDefined(options.repositoryConfig)) {
    Injector.register(EntityRepositoryConfig, { useValue: options.repositoryConfig });
  }
}
