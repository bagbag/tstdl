import { Singleton } from '#/injector/decorators.js';
import { LockProvider } from '#/lock/index.js';
import { DistributedLoop } from './distributed-loop.js';

@Singleton()
export class DistributedLoopProvider {
  private readonly lockProvider: LockProvider;

  constructor(lockProvider: LockProvider) {
    this.lockProvider = lockProvider;
  }

  get(key: string): DistributedLoop {
    return new DistributedLoop(key, this.lockProvider);
  }
}
