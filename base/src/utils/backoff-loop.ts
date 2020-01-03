import { CancellationToken } from './cancellation-token';
import { cancelableTimeout } from './timing';

export enum BackoffStrategy {
  Linear,
  Exponential
}

type BackoffLoopOptions = {
  strategy: BackoffStrategy;
  initialDelay: number;
  increase: number;
  maximumDelay: number;
};

type LoopFunction = (cancellationToken: CancellationToken) => Promise<boolean>;

export async function backoffLoop({ strategy, initialDelay, increase, maximumDelay }: BackoffLoopOptions, cancellationToken: CancellationToken, loopFunction: LoopFunction): Promise<void> {
  let delay = initialDelay;

  const loopCancellationToken = cancellationToken.createChild('set');

  while (!loopCancellationToken.isSet) {
    const backoff = await loopFunction(loopCancellationToken);

    if (backoff) {
      await cancelableTimeout(delay, cancellationToken);
      delay = getNewDelay(strategy, delay, increase, maximumDelay);
    }
    else {
      delay = initialDelay;
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
