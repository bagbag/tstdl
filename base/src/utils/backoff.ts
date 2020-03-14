import { CancellationToken } from './cancellation-token';
import { cancelableTimeout, timeout } from './timing';

export enum BackoffStrategy {
  Linear,
  Exponential
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
  }

  reset(): void {
    this.delay = this.initialDelay;
  }

  async backoff(cancellationToken?: CancellationToken): Promise<void> {
    await ((cancellationToken == undefined) ? timeout(this.delay) : cancelableTimeout(this.delay, cancellationToken));
    this.delay = getNewDelay(this.strategy, this.delay, this.increase, this.maximumDelay);
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
      await backoffHelper.backoff(loopCancellationToken);
    }
    else {
      backoffHelper.reset();
    }
  }
}

export async function* backoffGenerator(options: BackoffOptions, cancellationToken: CancellationToken): AsyncIterableIterator<() => void> {
  const backoffHelper = new BackoffHelper(options);
  const loopCancellationToken = cancellationToken.createChild('set');

  while (!cancellationToken.isSet) {
    let backoff = false;
    yield () => (backoff = true);

    if (backoff) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      await backoffHelper.backoff(loopCancellationToken);
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
