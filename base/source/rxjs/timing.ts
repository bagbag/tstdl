import { Observable } from 'rxjs';

export const singleImmediate$ = singleCallback(setImmediate, clearImmediate);
export const immediate$ = recursiveCallback(setImmediate, clearImmediate);

export const singleNextTick$ = singleCallback((callback) => process.nextTick(callback));
export const nextTick$ = recursiveCallback((callback) => process.nextTick(callback));

export const singleIdle$ = singleCallback(requestIdleCallback, cancelIdleCallback);
export const idle$ = recursiveCallback(requestIdleCallback, cancelIdleCallback);

export const singleAnimationFrame$ = singleCallback(requestAnimationFrame, cancelAnimationFrame);
export const animationFrame$ = recursiveCallback(requestAnimationFrame, cancelAnimationFrame);

function singleCallback<T, H>(scheduler: (callback: (value: T) => void) => H, canceller?: (handle: H) => void): Observable<T> {
  return new Observable<T>((subscriber) => {
    const handle = scheduler((value) => subscriber.next(value));
    return () => canceller?.(handle);
  });
}

function recursiveCallback<T, H>(scheduler: (callback: (value: T) => void) => H, canceller?: (handle: H) => void): Observable<T> {
  return new Observable<T>((subscriber) => {
    let handle: H;

    function schedule(): void {
      handle = scheduler((value: T) => {
        schedule();
        subscriber.next(value);
      });
    }

    schedule();

    return () => canceller?.(handle);
  });
}
