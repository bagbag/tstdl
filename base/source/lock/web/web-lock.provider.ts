import { InjectArg, Singleton } from '#/injector/index.js';
import type { Lock } from '#/lock/index.js';
import { LockProvider } from '#/lock/index.js';
import { WebLock } from './web-lock.js';

@Singleton()
export class WebLockProvider extends LockProvider {
  private readonly _prefix: string;

  constructor(@InjectArg() prefix: string = '') {
    super();

    this._prefix = prefix;
  }

  prefix(prefix: string): LockProvider {
    return new WebLockProvider(this._prefix + prefix);
  }

  get(resource: string): Lock {
    return new WebLock(this._prefix + resource);
  }
}
