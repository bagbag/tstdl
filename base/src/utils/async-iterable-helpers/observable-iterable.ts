import { Observable } from 'rxjs';
import { AwaitableList } from '../../collections/awaitable';
import { CancellationToken } from '../cancellation-token';

export async function* observableAsyncIterable<T>(observable: Observable<T>): AsyncIterableIterator<T> {
  const buffer = new AwaitableList<T>();
  const completeToken = new CancellationToken();
  const errorToken = new CancellationToken();
  let _error: any;

  const subscription = observable.subscribe({
    next: (value) => buffer.append(value),
    complete: () => completeToken.set(),
    error: (error) => {
      _error = error;
      errorToken.set();
    }
  });

  try {
    while (buffer.size > 0 || !completeToken.isSet) {
      if (buffer.size == 0) {
        await Promise.race([buffer.added, completeToken, errorToken]);
      }

      while (buffer.size > 0) {
        yield buffer.shift();
      }

      if (errorToken.isSet) {
        throw _error;
      }
    }
  }
  finally {
    subscription.unsubscribe();
  }
}
