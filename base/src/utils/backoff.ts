import type { CancellationToken } from './cancellation-token';
import { cancelableTimeout } from './timing';

export enum BackoffStrategy {
  Linear = 0,
  Exponential = 1
}

export type BackoffOptions = {
  strategy: BackoffStrategy,
  initialDelay: number,
  increase: number,
  maximumDelay: number
};

export class BackoffHelper {
  private readonly strategy: BackoffStrategy;
  private readonly initialDelay: number;
  private readonly increase: number;
  private readonly maximumDelay: number;

  private delay: number;

  constructor({ strategy, initialDelay, increase, maximumDelay }: BackoffOptions) {
    this.strategy = strategy;
    this.initialDelay = initialDelay;
    this.increase = increase;
    this.maximumDelay = maximumDelay;

    this.reset();
  }

  reset(): void {
    this.delay = this.initialDelay;
  }

  backoff(): number {
    this.delay = getNewDelay(this.strategy, this.delay, this.increase, this.maximumDelay);
    return this.delay;
  }
}

type LoopFunction = (cancellationToken: CancellationToken) => void | boolean | Promise<void | boolean>;

export async function backoffLoop(options: BackoffOptions, cancellationToken: CancellationToken, loopFunction: LoopFunction): Promise<void> {
  const backoffHelper = new BackoffHelper(options);
  const loopCancellationToken = cancellationToken.createChild('set');

  while (!loopCancellationToken.isSet) {
    const returnValue = loopFunction(loopCancellationToken);
    const backoff = (returnValue instanceof Promise ? await returnValue : returnValue) == true;

    if (backoff) {
      const milliseconds = backoffHelper.backoff();
      await cancelableTimeout(milliseconds, loopCancellationToken);
    }
    else {
      backoffHelper.reset();
    }
  }
}

export async function* backoffGenerator(options: BackoffOptions, cancellationToken: CancellationToken): AsyncIterableIterator<() => void> {
  const backoffHelper = new BackoffHelper(options);

  while (!cancellationToken.isSet) {
    let backoff = false;
    yield () => (backoff = true);

    if (backoff) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      const milliseconds = backoffHelper.backoff();
      await cancelableTimeout(milliseconds, cancellationToken);
    }
    else {
      backoffHelper.reset();
    }
  }
}

function getNewDelay(strategy: BackoffStrategy, currentDelay: number, increase: number, maximumDelay: number): number {
  let newDelay: number;

  switch (strategy) {
    case BackoffStrategy.Linear:
      newDelay = currentDelay + increase;
      break;

    case BackoffStrategy.Exponential:
      newDelay = currentDelay * increase;
      break;

    default:
      throw new Error('unknown backoff-strategy');
  }

  newDelay = Math.min(newDelay, maximumDelay);
  return newDelay;
}
