import { Observable } from 'rxjs';

export const singleIdle$ = singleCallback((callback: IdleRequestCallback) => requestIdleCallback(callback), (handle) => cancelIdleCallback(handle));
export const idle$ = recursiveCallback((callback: IdleRequestCallback) => requestIdleCallback(callback), (handle) => cancelIdleCallback(handle));

export const singleAnimationFrame$ = singleCallback((callback: FrameRequestCallback) => requestAnimationFrame(callback), (handle) => cancelAnimationFrame(handle));
export const animationFrame$ = recursiveCallback((callback: FrameRequestCallback) => requestAnimationFrame(callback), (handle) => cancelAnimationFrame(handle));

export const singleImmediate$ = singleCallback((callback) => setImmediate(callback), (handle) => clearImmediate(handle));
export const immediate$ = recursiveCallback((callback) => setImmediate(callback), (handle) => clearImmediate(handle));

export const microtask$ = singleCallback((callback: (value: void) => void) => queueMicrotask(callback));

export const singleNextTick$ = singleCallback((callback) => process.nextTick(callback));
export const nextTick$ = recursiveCallback((callback) => process.nextTick(callback));

function singleCallback<T, H>(scheduler: (callback: (value: T) => void) => H, canceller?: (handle: H) => void): Observable<T> {
  return new Observable<T>((subscriber) => {
    const handle = scheduler((value) => {
      subscriber.next(value);
      subscriber.complete();
    });

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
