import type { ReadonlyCancellationToken } from './cancellation-token';
import { CancellationToken } from './cancellation-token';
import { noop } from './noop';
import { cancelableTimeout } from './timing';
import { isDefined } from './type-guards';

export type BackoffStrategy = 'linear' | 'exponential';

export type BackoffOptions = {
  /**
   * how to increase delay
   */
  strategy: BackoffStrategy,

  /**
   * delay to start with
   */
  initialDelay: number,

  /**
   * amount to increase/multiply delay by/with
   */
  increase: number,

  /**
   * miaxmum time to back off
   */
  maximumDelay?: number
};

export type BackoffLoopController = {
  /**
   * backoff before next iteration
   */
  backoff: () => void,

  /**
   * break out of loop
   */
  break: () => void
};

export type BackoffLoopFunction = (controller: BackoffLoopController) => void | Promise<void>;

/**
 * @param continueToken token to continue loop immediately
 */
export type BackoffGeneratorYield = (continueToken?: CancellationToken) => void;

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
    this.maximumDelay = maximumDelay ?? Number.MAX_SAFE_INTEGER;

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

/**
 * runs a function until token is set or controller returns and automatically backsoff if function throws. Warning: swallows errors
 * @param options backoff options
 * @param cancellationToken token to cancel loop
 * @param loopFunction function to call
 */
export async function autoBackoffLoop(options: BackoffOptions, loopFunction: BackoffLoopFunction, extras?: { cancellationToken?: ReadonlyCancellationToken, errorHandler?: (error: Error) => void }): Promise<void> {
  const errorHandler = extras?.errorHandler ?? noop;

  return backoffLoop(options, async (controller) => {
    try {
      await loopFunction(controller);
    }
    catch (error: unknown) {
      errorHandler(error as Error);
      controller.backoff();
    }
  }, { cancellationToken: extras?.cancellationToken });
}

/**
 * runs a function until token is set or controller returns.
 * @param options backoff options
 * @param cancellationToken token to cancel loop
 * @param loopFunction function to call
 */
export async function backoffLoop(options: BackoffOptions, loopFunction: BackoffLoopFunction, extras?: { cancellationToken?: ReadonlyCancellationToken }): Promise<void> {
  const backoffHelper = new BackoffHelper(options);
  const loopCancellationToken = extras?.cancellationToken?.createChild({ unset: false, complete: false }) ?? new CancellationToken();
  let backoff = false;

  const controller: BackoffLoopController = {
    backoff: () => backoff = true,
    break: () => loopCancellationToken.set()
  };

  while (!loopCancellationToken.isSet) {
    await loopFunction(controller);

    if (loopCancellationToken.isSet) {
      return;
    }

    if (backoff) {
      backoff = false;
      const milliseconds = backoffHelper.backoff();
      await cancelableTimeout(milliseconds, loopCancellationToken);
    }
    else {
      backoffHelper.reset();
    }
  }
}

/**
 * generates endless function which, when called, backs off next iteration
 * @param options backoff options
 * @param cancellationToken token to cancel loop
 * @example
 * for await (const backoff of backoffGenerator(options, token)) {
 *  if (iWantToBackoff) {
 *    backoff();
 *  }
 * }
 */
export async function* backoffGenerator(options: BackoffOptions, cancellationToken: ReadonlyCancellationToken): AsyncIterableIterator<BackoffGeneratorYield> {
  const backoffHelper = new BackoffHelper(options);

  while (cancellationToken.isUnset) {
    let backoff = false;
    let timeoutToken: ReadonlyCancellationToken | undefined = cancellationToken;

    const backoffFunction: BackoffGeneratorYield = (continueToken?: CancellationToken): void => {
      backoff = true;

      if (isDefined(continueToken)) {
        timeoutToken = cancellationToken.createChild().inherit(continueToken);
      }
    };

    yield backoffFunction;

    if (backoff) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      const milliseconds = backoffHelper.backoff();
      await cancelableTimeout(milliseconds, timeoutToken);
    }
    else {
      backoffHelper.reset();
    }
  }
}

function getNewDelay(strategy: BackoffStrategy, currentDelay: number, increase: number, maximumDelay: number): number {
  let newDelay: number;

  switch (strategy) {
    case 'linear':
      newDelay = currentDelay + increase;
      break;

    case 'exponential':
      newDelay = currentDelay * increase;
      break;

    default:
      throw new Error('unknown backoff-strategy');
  }

  newDelay = Math.min(newDelay, maximumDelay);
  return newDelay;
}
