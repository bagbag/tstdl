import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import type { Lock } from '#/lock/index.js';
import { LockProvider } from '#/lock/index.js';
import { Logger } from '#/logger/index.js';
import { assertDefinedPass } from '#/utils/type-guards.js';
import { MongoLock } from './lock.js';
import { mongoLockModuleConfig } from './module.js';
import { MongoLockRepository } from './mongo-lock-repository.js';

@Singleton()
export class MongoLockProvider extends LockProvider {
  readonly #injector = inject(Injector);
  readonly #lockRepository = inject(MongoLockRepository, assertDefinedPass(mongoLockModuleConfig.lockEntityRepositoryConfig, 'mongo lock module not configured'));
  readonly #logger = inject(Logger, 'MongoLock');
  readonly #prefix = injectArgument(this);

  prefix(prefix: string): MongoLockProvider {
    return this.#injector.resolve(MongoLockProvider, this.getResourceString(prefix));
  }

  get(resource: string): Lock {
    return new MongoLock(this.#lockRepository, this.getResourceString(resource), this.#logger);
  }

  private getResourceString(resource: string): string {
    const prefixDivider = (this.#prefix.length > 0) ? ':' : '';
    return `${this.#prefix}${prefixDivider}${resource}`;
  }
}
