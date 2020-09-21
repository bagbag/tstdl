import { LockProvider } from '@tstdl/base/lock';
import { DeferredPromise } from '@tstdl/base/promise';
import { cancelableTimeout, CancellationToken, Timer } from '@tstdl/base/utils';
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
    const stopToken = new CancellationToken();

    const stopFunction = async (): Promise<void> => {
      if (!stopToken.isSet) {
        stopToken.set();
      }

      await stopped;
    };

    const controller: LoopController = {
      stop: stopFunction,
      stopped
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      const lock = this.lockProvider.get(this.key);
      const timer = new Timer();

      try {
        // eslint-disable-next-line no-unmodified-loop-condition
        while (!stopToken.isSet) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
          timer.restart();

          await lock.using(0, false, async () => {
            await func(controller);

            const timeLeft = interval - timer.milliseconds;
            const timeoutDuration = timeLeft - (accuracy / 2);
            await cancelableTimeout(timeoutDuration, stopToken);
          });

          await cancelableTimeout(accuracy, stopToken);
        }
      }
      finally {
        stopped.resolve();
      }
    })();

    return controller;
  }
}
