import { injectable } from '#/container/index.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import { CancellationToken } from '#/utils/cancellation-token.js';
import { assertStringPass, isDefined, isNull, isObject } from '#/utils/type-guards.js';
import { map, timer } from 'rxjs';
import type { AcquireResult, LockArgument, LockController, LockedFunction, UsingResult } from '../lock.js';
import { Lock } from '../lock.js';
import { WebLockProvider } from './web-lock.provider.js';

@injectable({
  provider: {
    useFactory: (argument, context) => {
      const arg = argument as LockArgument;
      const prefix = isObject(arg) ? assertStringPass(arg.prefix, 'invalid lock argument') : undefined;
      const resource = assertStringPass(isObject(arg) ? arg.resource : arg, 'invalid lock argument');

      const provider = context.resolve(WebLockProvider, prefix);
      return provider.get(resource);
    }
  }
})
export class WebLock extends Lock {
  constructor(resource: string) {
    super(resource);
  }

  async acquire<Throw extends boolean>(timeout: number | undefined, throwOnFail: Throw): Promise<AcquireResult<Throw>> {
    const acquirePromise = new DeferredPromise<boolean>();
    const releasePromise = new DeferredPromise();

    const controller: LockController = {
      lost: false,
      release(): void {
        releasePromise.resolve();
      }
    };

    const timeoutToken = (isDefined(timeout) && (timeout > 0)) ? CancellationToken.fromObservable(timer(timeout).pipe(map(() => true))) : undefined;

    void navigator.locks.request(
      this.resource,
      {
        signal: isDefined(timeoutToken) ? timeoutToken.asAbortSignal : undefined,
        ifAvailable: isDefined(timeout) && (timeout <= 0)
      },
      async (lock) => {
        if (isNull(lock)) {
          acquirePromise.resolve(false);
          return;
        }

        acquirePromise.resolve(true);
        await releasePromise;
      }
    )
      .catch((error) => acquirePromise.reject(error));

    try {
      const success = await acquirePromise;

      if (!success) {
        throw new Error('Failed to acquire lock.');
      }

      return controller;
    }
    catch (error) {
      if (throwOnFail) {
        throw error;
      }

      return false as AcquireResult<Throw>;
    }
  }

  async use<Throw extends boolean, R>(timeout: number | undefined, throwOnFail: Throw, func: LockedFunction<R>): Promise<UsingResult<Throw, R>> {
    const controller = await this.acquire(timeout, throwOnFail) as AcquireResult<false>;

    if (controller == false) {
      return { success: false, result: undefined } as UsingResult<Throw, R>;
    }

    try {
      const result = await func(controller);
      return { success: true, result } as UsingResult<Throw, R>;
    }
    finally {
      await controller.release();
    }
  }

  async exists(): Promise<boolean> {
    const locks = await navigator.locks.query();
    return locks.held?.some((lock) => lock.name == this.resource) ?? false;
  }
}
