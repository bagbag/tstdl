import { firstValueFrom } from '#/rxjs/compat';
import { mapTo, race } from 'rxjs';
import type { AnyIterable } from '../any-iterable-iterator';
import type { ReadonlyCancellationToken } from '../cancellation-token';
import { isAsyncIterable } from './is-async-iterable';

export function takeUntilAsync<T>(iterable: AnyIterable<T>, cancellationToken: ReadonlyCancellationToken): AsyncIterableIterator<T> {
  return isAsyncIterable(iterable)
    ? async(iterable, cancellationToken)
    : sync(iterable, cancellationToken);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function* sync<T>(iterable: Iterable<T>, cancellationToken: ReadonlyCancellationToken): AsyncIterableIterator<T> {
  if (cancellationToken.isSet) {
    return;
  }

  for (const item of iterable) {
    yield item;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (cancellationToken.isSet) {
      break;
    }
  }
}

async function* async<T>(iterable: AsyncIterable<T>, cancellationToken: ReadonlyCancellationToken): AsyncIterableIterator<T> {
  const iterator = iterable[Symbol.asyncIterator]();
  const cancel$ = cancellationToken.set$.pipe(mapTo<IteratorResult<T>>({ done: true, value: undefined })); // eslint-disable-line @typescript-eslint/no-unsafe-argument

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
