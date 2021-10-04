import { firstValueFrom } from '#/rxjs/compat';
import { mapTo, race } from 'rxjs';
import type { AnyIterable } from '../any-iterable-iterator';
import type { ReadonlyCancellationToken } from '../cancellation-token';
import { iterableToAsyncIterator } from './to-async-iterator';

export async function* cancelableAsync<T>(source: AnyIterable<T>, cancellationToken: ReadonlyCancellationToken): AsyncIterableIterator<T> {
  const iterator = iterableToAsyncIterator(source);

  while (cancellationToken.isUnset) {
    const result = await firstValueFrom(race([iterator.next(), cancellationToken.set$.pipe(mapTo({ done: true } as IteratorResult<T>))])); // eslint-disable-line @typescript-eslint/no-unsafe-argument

    if (result.done == true) {
      return result.value as undefined;
    }

    yield result.value;
  }

  return undefined;
}
