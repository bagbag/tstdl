import { Logger } from '../logger';
import { CancellationToken } from './cancellation-token';
import { formatDuration } from './helpers';
import { AggregationMode, PeriodicSampler } from './periodic-sampler';
import { Timer } from './timer';

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

export function runEventLoopWatcher(logger: Logger, cancellationToken: CancellationToken): void {
  const sampler = new PeriodicSampler(measureEventLoopDelay, 50);

  sampler
    .watch(0, 100, AggregationMode.ThirdQuartile)
    .subscribe((delay) => logger.debug(`eventloop: ${formatDuration(delay, 2)}`));

  sampler.start();

  // tslint:disable-next-line: no-floating-promises
  cancellationToken.then(async () => await sampler.stop());
}
