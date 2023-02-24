import { singleton } from '#/container/index.js';
import { LockProvider } from '#/lock/index.js';
import { DistributedLoop } from './distributed-loop.js';

@singleton()
export class DistributedLoopProvider {
  private readonly lockProvider: LockProvider;

  constructor(lockProvider: LockProvider) {
    this.lockProvider = lockProvider;
  }

  get(key: string): DistributedLoop {
    return new DistributedLoop(key, this.lockProvider);
  }
}
