import { ObservableSet } from '../../../collections/observable/observable-set.js';
import { MultiError } from '../../../errors/multi.error.js';
import type { AnyIterable } from '../../any-iterable-iterator.js';
import type { ParallelizableIteratorFunction } from '../types.js';

export async function parallelForEach<T>(iterable: AnyIterable<T>, concurrency: number, func: ParallelizableIteratorFunction<T, any>): Promise<void> {
  const running = new ObservableSet<Promise<any>>();
  const errors: Error[] = [];

  let index = 0;
  for await (const item of iterable) {
    if (errors.length > 0) {
      break;
    }

    const run = func(item, index++);
    running.add(run);
    run.catch((error) => errors.push(error as Error)).finally(() => running.delete(run));

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
