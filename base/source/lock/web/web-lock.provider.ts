import { injectArg, singleton } from '#/container';
import type { Lock } from '#/lock';
import { LockProvider } from '#/lock';
import { WebLock } from './web-lock';

@singleton()
export class WebLockProvider extends LockProvider {
  private readonly _prefix: string;

  constructor(@injectArg() prefix: string = '') {
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
