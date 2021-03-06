import type { MonoTypeOperatorFunction, Observable, ObservableInput } from 'rxjs';
import { defer, from, of, timer } from 'rxjs';
import { delayWhen, retryWhen, scan, tap } from 'rxjs/operators';
import type { BackoffOptions } from '../utils';
import { BackoffHelper } from '../utils';

export function retryBackoff<T>(count: number, options: BackoffOptions): MonoTypeOperatorFunction<T> {
  const helper = new BackoffHelper(options);

  return retryWhen<T>((errors) => errors.pipe(
    scan((counter, error: Error) => {
      if (counter == count) {
        throw error;
      }

      return counter + 1;
    }, 0),
    delayWhen(() => timer(helper.backoff()))
  ));
}

export function retryBackoffHandled<T>(count: number, options: BackoffOptions, handler: (error: Error, count: number) => void | undefined | ObservableInput<void>): MonoTypeOperatorFunction<T> {
  const helper = new BackoffHelper(options);

  return (source: Observable<T>) => defer(() => {
    let counter = 0;

    const observable = source.pipe(
      tap(() => (counter = 0)),
      retryWhen<T>((errors) => errors.pipe(
        tap(() => counter++),
        delayWhen((error) => {
          if (counter >= count) {
            const returnValue = handler(error, counter);
            return (returnValue != undefined) ? from(returnValue) : of(undefined);
          }

          return of(undefined);
        }),
        delayWhen(() => timer(helper.backoff()))
      ))
    );

    return observable;
  });
}
