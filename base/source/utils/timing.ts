import { firstValueFrom, map, race, timer } from 'rxjs';

import type { CancellationSignal } from '#/cancellation/token.js';
import { TimeoutError } from '#/errors/timeout.error.js';
import { _throw } from './throw.js';
import { resolveValueOrProvider, type ValueOrProvider } from './value-or-provider.js';

/** Timeout for specified duration */
export async function timeout(milliseconds: number = 0, options?: { abortSignal?: AbortSignal }): Promise<void> {
  return new Promise<void>((resolve) => {
    const abortListener = () => clearTimeout(timeoutRef);

    const timeoutRef = setTimeout(() => {
      options?.abortSignal?.removeEventListener('abort', abortListener);
      resolve();
    }, milliseconds);

    options?.abortSignal?.addEventListener('abort', abortListener);
  });
}

/** Timeout until specified time */
export async function timeoutUntil(timestamp: number | Date): Promise<void> {
  const left = timestamp.valueOf() - Date.now();
  return timeout(left);
}

/** Timeout for specified duration */
export async function cancelableTimeout(milliseconds: number, cancelSignal: CancellationSignal): Promise<boolean> {
  return firstValueFrom(race([
    timer(milliseconds).pipe(map(() => false)), // eslint-disable-line @typescript-eslint/no-unsafe-argument
    cancelSignal.set$.pipe(map(() => true)) // eslint-disable-line @typescript-eslint/no-unsafe-argument
  ]));
}

/** Timeout until specified time */
export async function cancelableTimeoutUntil(timestamp: number | Date, cancelSignal: CancellationSignal): Promise<boolean> {
  const left = timestamp.valueOf() - Date.now();
  return cancelableTimeout(left, cancelSignal);
}

export async function withTimeout<T>(milliseconds: number, promiseOrProvider: ValueOrProvider<Promise<T>>, options?: { errorMessage?: string }): Promise<T> {
  const abortController = new AbortController();
  const promise = resolveValueOrProvider(promiseOrProvider);

  void promise.then(() => abortController.abort());

  return Promise.race([
    promise,
    timeout(milliseconds, { abortSignal: abortController.signal }).then(() => _throw(new TimeoutError(options?.errorMessage)))
  ]);
}

export async function immediate(): Promise<void> {
  return new Promise<void>(setImmediate as (callback: () => void) => void);
}

export async function nextTick(): Promise<void> {
  return new Promise<void>((resolve) => process.nextTick(resolve));
}

export async function animationFrame(): Promise<number> {
  return new Promise<number>(requestAnimationFrame);
}

export async function idle(timeout?: number): Promise<IdleDeadline> { // eslint-disable-line @typescript-eslint/no-shadow
  return new Promise<IdleDeadline>((resolve) => requestIdleCallback(resolve, { timeout }));
}
