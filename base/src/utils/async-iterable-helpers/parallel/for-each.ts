import { ObservableSet } from '../../../collections/observable';
import { MultiError } from '../../../error/multi.error';
import type { AnyIterable } from '../../any-iterable-iterator';
import type { ParallelizableIteratorFunction } from '../types';

export async function parallelForEach<T>(iterable: AnyIterable<T>, concurrency: number, func: ParallelizableIteratorFunction<T, any>): Promise<void> {
  const running = new ObservableSet<Promise<void>>();
  const errors: Error[] = [];

  let index = 0;
  for await (const item of iterable) {
    if (errors.length > 0) {
      break;
    }

    const run = func(item, index++);
    running.add(run);
    run.finally(() => running.delete(run)).catch((error) => errors.push(error as Error));

    if (running.length >= concurrency) {
      await running.$length;
    }
  }

  while (running.length > 0) {
    await running.$empty;
  }

  if (errors.length > 0) {
    throw (errors.length > 1) ? new MultiError(errors) : errors[0]!;
  }
}
