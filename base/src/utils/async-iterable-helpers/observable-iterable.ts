import type { Observable } from 'rxjs';
import { merge } from 'rxjs';
import { take } from 'rxjs/operators';
import { ObservableArray } from '../../collections/observable';
import { CancellationToken } from '../cancellation-token';

export async function* observableAsyncIterable<T>(observable: Observable<T>): AsyncIterableIterator<T> {
  let buffer = new ObservableArray<T>();
  const completeToken = new CancellationToken();
  const errorToken = new CancellationToken();
  let error: any;

  const subscription = observable.subscribe({
    next: (value) => buffer.add(value),
    complete: () => completeToken.set(),
    error: (_error) => {
      error = _error;
      errorToken.set();
    }
  });

  try {
    while (buffer.length > 0 || !completeToken.isSet) {
      if (buffer.length == 0) {
        await merge(buffer.add$, completeToken.set$, errorToken.set$).pipe(take(1)).toPromise();
      }

      const out = buffer;
      buffer = new ObservableArray(); // eslint-disable-line require-atomic-updates

      yield* out;

      if (errorToken.isSet) {
        throw error;
      }
    }
  }
  finally {
    subscription.unsubscribe();
  }
}
