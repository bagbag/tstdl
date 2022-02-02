import { singleton } from '#/container';
import { LockProvider } from '#/lock';
import { DistributedLoop } from './distributed-loop';

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
