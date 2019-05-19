import { AnyIterable } from '../../any-iterable-iterator';
import { AwaitableSet } from '../../collections/awaitable';
import { MultiError } from '../../multi-error';
import { ParallelizableIteratorFunction } from '../types';

export async function parallelForEach<T>(iterable: AnyIterable<T>, concurrency: number, func: ParallelizableIteratorFunction<T, any>): Promise<void> {
  const running = new AwaitableSet<Promise<void>>();
  const errors: Error[] = [];

  let index = 0;
  for await (const item of iterable) {
    if (errors.length > 0) {
      break;
    }

    const run = func(item, index++);
    running.add(run);
    run.finally(() => running.delete(run)).catch((error) => errors.push(error as Error));

    if (running.size >= concurrency) {
      await running.deleted;
    }
  }

  while (running.size > 0) {
    await running.deleted;
  }

  if (errors.length > 0) {
    throw (errors.length > 1)
      ? new MultiError(errors)
      : errors[0];
  }
}
