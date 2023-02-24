import type { Logger } from '../logger/index.js';
import type { ReadonlyCancellationToken } from './cancellation-token.js';
import { formatDuration } from './helpers.js';
import { AggregationMode, PeriodicSampler } from './periodic-sampler.js';
import { Timer } from './timer.js';

export async function measureEventLoopDelay(): Promise<number> {
  return new Promise<number>((resolve) => {
    const stopwatch = new Timer();

    setImmediate(() => {
      stopwatch.start();
      // inner setImmediate, to measure an full event-loop-cycle
      setImmediate(() => resolve(stopwatch.milliseconds));
    });
  });
}

export function runEventLoopWatcher(logger: Logger, cancellationToken: ReadonlyCancellationToken): void {
  const sampler = new PeriodicSampler(measureEventLoopDelay, 50);

  sampler
    .watch(0, 100, AggregationMode.ThirdQuartile)
    .subscribe((delay) => logger.debug(`eventloop: ${formatDuration(delay, 2)}`));

  sampler.start();

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  cancellationToken.then(async () => sampler.stop());
}
