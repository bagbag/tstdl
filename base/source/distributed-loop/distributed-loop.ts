import type { Injectable } from '#/container';
import { injectable, injectArg, resolveArgumentType } from '#/container';
import { LockProvider } from '#/lock';
import { DeferredPromise } from '#/promise';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import { CancellationToken } from '#/utils/cancellation-token';
import { Timer } from '#/utils/timer';
import { cancelableTimeout } from '#/utils/timing';
import type { LoopController } from './controller';

export type LoopFunction = (controller: LoopController) => any | Promise<any>;

/** loop key */
export type DistributedLoopArgument = string;


@injectable()
export class DistributedLoop implements Injectable<DistributedLoopArgument> {
  private readonly key: string;
  private readonly lockProvider: LockProvider;

  [resolveArgumentType]: string;

  /**
   * a loop which runs distributed in the scope of the provided {@link LockProvider}.
   * There will be at most only one actively running handler at the same time
   *
   * you can for example use the MongoLockProvider to have a shared loop over
   * multiple app processes (cluster) to regularly call an api for updates
   * @param key loop key to distinguish between multiple loops
   * @param lockProvider
   */
  constructor(@injectArg() key: string, lockProvider: LockProvider) {
    this.key = key;
    this.lockProvider = lockProvider.prefix('loop:');
  }

  /**
   * run the function {@link func} every {@link interval} milliseconds with an accuracy of {@link accuracy}
   * until {@link cancellationToken} is set or stop on the {@link LoopController} is called
   * @param interval in millseconds
   * @param accuracy in millseconds
   * @param func handler to run
   * @param cancellationToken token to cancel loop (same as calling stop on the {@link LoopController})
   */
  run(interval: number, accuracy: number, func: LoopFunction, cancellationToken?: ReadonlyCancellationToken): LoopController {
    const $stopped = new DeferredPromise();
    const stopToken = cancellationToken?.createChild() ?? new CancellationToken();

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

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      const lock = this.lockProvider.get(this.key);
      const timer = new Timer();

      try {
        // eslint-disable-next-line no-unmodified-loop-condition
        while (!stopToken.isSet) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
          timer.restart();

          await lock.using(undefined, false, async () => {
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
