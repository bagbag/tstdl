import type { MonoTypeOperatorFunction } from 'rxjs';
import { timer } from 'rxjs';
import { delayWhen, retryWhen, scan } from 'rxjs/operators';
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
