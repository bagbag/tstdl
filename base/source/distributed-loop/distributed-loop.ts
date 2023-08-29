import type { CancellationSignal } from '#/cancellation/index.js';
import { CancellationToken } from '#/cancellation/index.js';
import { InjectArg, Injectable, resolveArgumentType } from '#/injector/index.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { LockProvider } from '#/lock/index.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import { Timer } from '#/utils/timer.js';
import { cancelableTimeout } from '#/utils/timing.js';
import type { LoopController } from './controller.js';

export type LoopFunction = (controller: LoopController) => any | Promise<any>;

/** loop key */
export type DistributedLoopArgument = string;


@Injectable()
export class DistributedLoop implements Resolvable<DistributedLoopArgument> {
  private readonly key: string;
  private readonly lockProvider: LockProvider;

  declare readonly [resolveArgumentType]: string;

  /**
   * a loop which runs distributed in the scope of the provided {@link LockProvider}.
   * There will be at most only one actively running handler at the same time
   *
   * you can for example use the MongoLockProvider to have a shared loop over
   * multiple app processes (cluster) to regularly call an api for updates
   * @param key loop key to distinguish between multiple loops
   * @param lockProvider
   */
  constructor(@InjectArg() key: string, lockProvider: LockProvider) {
    this.key = key;
    this.lockProvider = lockProvider.prefix('loop:');
  }

  /**
   * run the function {@link func} every {@link interval} milliseconds with an accuracy of {@link accuracy}
   * until {@link cancellationSignal} is set or stop on the {@link LoopController} is called
   * @param interval in millseconds
   * @param accuracy in millseconds
   * @param func handler to run
   * @param cancellationSignal token to cancel loop (same as calling stop on the {@link LoopController})
   */
  run(interval: number, accuracy: number, func: LoopFunction, cancellationSignal?: CancellationSignal): LoopController {
    const $stopped = new DeferredPromise();
    const stopToken = cancellationSignal?.createChild() ?? new CancellationToken();

    const stopFunction = async (): Promise<void> => {
      if (!stopToken.isSet) {
        stopToken.set();
      }

      await $stopped;
    };

    const controller: LoopController = {
      stop: stopFunction,
      $stopped
    };

    void (async () => {
      const lock = this.lockProvider.get(this.key);
      const timer = new Timer();

      try {
        while (!stopToken.isSet) {
          timer.restart();

          await lock.use(undefined, false, async () => {
            await func(controller);

            const timeLeft = interval - timer.milliseconds;
            const timeoutDuration = timeLeft - (accuracy / 2);
            await cancelableTimeout(timeoutDuration, stopToken);
          });

          await cancelableTimeout(accuracy, stopToken);
        }
      }
      finally {
        $stopped.resolve();
      }
    })();

    return controller;
  }
}
