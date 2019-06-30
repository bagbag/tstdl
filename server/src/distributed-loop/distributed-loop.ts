import { LockProvider } from '@tstdl/base/lock';
import { DeferredPromise } from '@tstdl/base/promise';
import { cancelableTimeout, Timer } from '@tstdl/base/utils';
import { LoopController } from './controller';

export type LoopFunction = (controller: LoopController) => any | Promise<any>;

export class DistributedLoop {
  private readonly key: string;
  private readonly lockProvider: LockProvider;

  constructor(key: string, lockProvider: LockProvider) {
    this.key = `loop:${key}`;
    this.lockProvider = lockProvider;
  }

  run(func: LoopFunction, interval: number, accuracy: number): LoopController {
    const stopped = new DeferredPromise();
    const stopPromise = new DeferredPromise();

    let stop = false;

    const stopFunction = async () => {
      if (!stop) {
        stop = true;
        stopPromise.resolve();
      }

      await stopped;
    };

    const controller: LoopController = {
      stop: stopFunction,
      stopped
    };

    // tslint:disable-next-line: no-floating-promises
    (async () => {
      const lock = this.lockProvider.get(this.key);
      const timer = new Timer();

      try {
        while (!stop) {
          timer.restart();

          await lock.acquire(0, async () => {
            await func(controller);

            const timeLeft = interval - timer.milliseconds;
            const timeoutDuration = timeLeft - (accuracy / 2);
            await cancelableTimeout(timeoutDuration, stopPromise);
          });

          await cancelableTimeout(accuracy, stopPromise);
        }
      }
      finally {
        stopped.resolve();
      }
    })();

    return controller;
  }
}
