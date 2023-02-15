import { injectable } from '#/container';
import { DeferredPromise } from '#/promise/deferred-promise';
import { CancellationToken } from '#/utils/cancellation-token';
import { assertStringPass, isDefined, isNull, isObject } from '#/utils/type-guards';
import { map, timer } from 'rxjs';
import type { AcquireResult, LockArgument, LockController, LockedFunction, UsingResult } from '../lock';
import { Lock } from '../lock';
import { WebLockProvider } from './web-lock.provider';

@injectable({
  provider: {
    useFactory: async (argument, context) => {
      const arg = argument as LockArgument;
      const prefix = isObject(arg) ? assertStringPass(arg.prefix, 'invalid lock argument') : undefined;
      const resource = assertStringPass(isObject(arg) ? arg.resource : arg, 'invalid lock argument');

      const provider = await context.resolveAsync(WebLockProvider, prefix);
      return provider.get(resource);
    }
  }
})
export class WebLock extends Lock {
  constructor(resource: string) {
    super(resource);
  }

  async acquire<Throw extends boolean>(timeout: number | undefined, throwOnFail: Throw): Promise<AcquireResult<Throw>> {
    const acquirePromise = new DeferredPromise<AcquireResult<Throw>>();
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
          throw new Error('Failed to acquire lock.');
        }

        acquirePromise.resolve(controller);
        return releasePromise;
      }
    ).catch((error) => {
      if (throwOnFail) {
        acquirePromise.reject(error);
      }

      acquirePromise.resolve(false as AcquireResult<Throw>);
    });

    return acquirePromise;
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
