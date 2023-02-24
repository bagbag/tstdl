import type { Observable } from 'rxjs';
import { merge, take } from 'rxjs';
import { ObservableArray } from '../../collections/observable/observable-array.js';
import { CancellationToken } from '../cancellation-token.js';

export async function* observableAsyncIterable<T>(observable: Observable<T>): AsyncIterableIterator<T> {
  const buffer = new ObservableArray<T>();
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

      while (buffer.length > 0) {
        const item = buffer.removeFirst();
        yield item;
      }

      if (errorToken.isSet) {
        throw error;
      }
    }
  }
  finally {
    subscription.unsubscribe();
  }
}
