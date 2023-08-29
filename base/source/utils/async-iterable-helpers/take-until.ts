import { firstValueFrom, map, race } from 'rxjs';

import type { CancellationSignal } from '#/cancellation/token.js';
import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';

export function takeUntilAsync<T>(iterable: AnyIterable<T>, cancellationSignal: CancellationSignal): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, cancellationSignal)
    : sync(iterable, cancellationSignal);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function* sync<T>(iterable: Iterable<T>, cancellationSignal: CancellationSignal): AsyncIterableIterator<T> {
  if (cancellationSignal.isSet) {
    return;
  }

  for (const item of iterable) {
    yield item;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (cancellationSignal.isSet) {
      break;
    }
  }
}

async function* async<T>(iterable: AsyncIterable<T>, cancellationSignal: CancellationSignal): AsyncIterableIterator<T> {
  const iterator = iterable[Symbol.asyncIterator]();
  const cancel$ = cancellationSignal.set$.pipe(map((): IteratorResult<T> => ({ done: true, value: undefined }))); // eslint-disable-line @typescript-eslint/no-unsafe-argument

  try {
    while (true) {
      const result = await firstValueFrom(race([iterator.next(), cancel$]));

      if (result.done == true) {
        return result.value as undefined;
      }

      yield (result as IteratorResult<T>).value;
    }
  }
  catch (error) {
    (iterator.throw ?? iterator.return)?.(error);
  }
  finally {
    iterator.return?.();
  }

  return undefined;
}
