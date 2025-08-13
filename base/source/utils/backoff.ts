import type { CancellationSignal } from '#/cancellation/token.js';
import { CancellationToken } from '#/cancellation/token.js';
import { NEVER } from 'rxjs';
import { randomFloat } from './math.js';
import { cancelableTimeout } from './timing.js';
import { isDefined } from './type-guards.js';

export type BackoffStrategy = 'linear' | 'exponential';

/**
 * Configuration for the backoff behavior.
 */
export type BackoffOptions = {
  /**
   * The strategy to use for increasing the delay.
   * - `linear`: Adds the `increase` value to the delay in each step.
   * - `exponential`: Multiplies the delay by the `increase` value in each step.
   * @default 'exponential'
   */
  strategy?: BackoffStrategy,

  /**
   * The initial delay in milliseconds. Must be non-negative.
   * @default 1000
   */
  initialDelay?: number,

  /**
   * The value to increase the delay with.
   * - For `linear` strategy, this is the number of milliseconds to add.
   * - For `exponential` strategy, this is the multiplication factor.
   * Must be non-negative. For exponential, should be > 1 to ensure growth.
   * @default 2
   */
  increase?: number,

  /**
   * The maximum delay in milliseconds. The backoff delay will not exceed this value.
   * @default 30000
   */
  maximumDelay?: number,

  /**
   * A factor to randomize the delay, e.g., 0.1 for 10% jitter.
   * This helps prevent the "thundering herd" problem in distributed systems.
   * The actual delay will be `delay ± delay * jitter`.
   * Must be a value between 0 and 1.
   * @default 0.15
   */
  jitter?: number,
};

export type AutoBackoffLoopOptions = BackoffOptions & {
  cancellationSignal?: CancellationSignal,
  errorHandler?: (error: Error) => void,
};

export type BackoffLoopOptions = BackoffOptions & {
  cancellationSignal?: CancellationSignal,
};

export type BackoffGeneratorOptions = BackoffOptions & {
  /**
   * An optional signal to terminate the generator.
   * The generator can also be terminated by breaking the `for-await-of` loop.
   */
  cancellationSignal?: CancellationSignal,
};

/**
 * Provides controls for the `backoffLoop`.
 */
export type BackoffLoopController = {
  /**
   * Schedules a backoff delay before the next iteration of the loop.
   * If this is not called, the backoff delay is reset for the next attempt.
   */
  backoff: () => void,

  /**
   * Immediately breaks out of the loop.
   */
  break: () => void,
};

export type BackoffLoopFunction = (controller: BackoffLoopController, cancellationSignal: CancellationSignal) => unknown;

/**
 * A function yielded by `backoffGenerator` to control the next iteration.
 */
export type BackoffGeneratorCallback = (options?: {
  /**
   * An optional signal that, when set, cancels the current backoff delay and proceeds
   * to the next iteration immediately. This is useful for "continue early" scenarios.
   */
  continueToken?: CancellationSignal,
}) => void;

/**
 * Default options for a robust backoff strategy.
 */
export const DEFAULT_BACKOFF_OPTIONS = {
  strategy: 'exponential',
  initialDelay: 1000,
  increase: 2,
  maximumDelay: 30_000, // 30 seconds
  jitter: 0.15,
} as const satisfies BackoffOptions;

/**
 * A helper class to manage the state of a backoff strategy.
 */
export class BackoffHelper {
  private readonly options: Required<BackoffOptions>;
  private currentDelay: number;

  /**
   * Creates a new BackoffHelper.
   * @param options Partial backoff options, which will be merged with sane defaults.
   */
  constructor(options?: BackoffOptions) {
    this.options = { ...DEFAULT_BACKOFF_OPTIONS, ...options };
    const { initialDelay, increase, jitter, strategy } = this.options;

    if (initialDelay < 0) {
      throw new Error('initialDelay must be non-negative.');
    }

    if (increase < 0) {
      throw new Error('increase must be non-negative.');
    }

    if ((jitter < 0) || (jitter > 1)) {
      throw new Error('jitter must be between 0 and 1.');
    }

    if (strategy == 'exponential' && increase <= 1) {
      console.warn('Using an exponential backoff with an increase factor <= 1 is not recommended as the delay will not grow.');
    }

    this.currentDelay = this.options.initialDelay;
  }

  /**
   * Resets the current delay to the initial delay.
   */
  reset(): void {
    this.currentDelay = this.options.initialDelay;
  }

  /**
   * Calculates and returns the next backoff delay based on the configured strategy.
   * This also updates the internal state for the subsequent call.
   * @returns The next delay in milliseconds.
   */
  getNextDelay(): number {
    const newDelay = getNewDelay(this.options.strategy, this.currentDelay, this.options.increase, this.options.maximumDelay);
    this.currentDelay = newDelay;

    if (this.options.jitter > 0) {
      const jitterAmount = newDelay * randomFloat(-this.options.jitter, this.options.jitter); // ±jitter
      return Math.max(0, newDelay + jitterAmount);
    }

    return newDelay;
  }
}

/**
 * Runs a function in a loop, automatically backing off on errors.
 *
 * This function is a convenient wrapper that catches any errors from `loopFunction`,
 * triggers a backoff, and continues the loop.
 *
 * @param loopFunction The asynchronous function to execute in each iteration.
 * @param options Additional options for backoff configuration, cancellation, and error handling.
 */
export async function autoBackoffLoop(loopFunction: BackoffLoopFunction, options: AutoBackoffLoopOptions = {}): Promise<void> {
  const { errorHandler, ...loopOptions } = options;

  await backoffLoop(async (controller, signal) => {
    try {
      await loopFunction(controller, signal);
    }
    catch (error: unknown) {
      errorHandler?.(error as Error);
      controller.backoff();
    }
  }, loopOptions);
}

/**
 * Runs a function in a loop, allowing manual control over backoff and breaking.
 * The loop continues until it is explicitly broken via the controller or the cancellation signal is set.
 * If `controller.backoff()` is not called in an iteration, the delay is reset for the next backoff.
 *
 * @param loopFunction The function to execute, receiving a controller to manage the loop.
 * @param options Additional options for backoff configuration and cancellation.
 */
export async function backoffLoop(loopFunction: BackoffLoopFunction, options: BackoffLoopOptions = {}): Promise<void> {
  const { cancellationSignal, ...backoffOptions } = options;
  const backoffHelper = new BackoffHelper(backoffOptions);
  const loopToken = new CancellationToken();

  let shouldBackoff = false;

  if (isDefined(cancellationSignal)) {
    loopToken.inherit(cancellationSignal, { set: true, unset: false, complete: false, error: false });
  }

  const controller: BackoffLoopController = {
    backoff: () => shouldBackoff = true,
    break: () => loopToken.set(),
  };

  while (loopToken.isUnset) {
    await loopFunction(controller, loopToken.signal);

    // Exit immediately if the loop function requested a break.
    if (loopToken.isSet) {
      return;
    }

    if (shouldBackoff) {
      shouldBackoff = false;
      const delay = backoffHelper.getNextDelay();
      await cancelableTimeout(delay, loopToken.signal);
    }
    else {
      // If an iteration completes successfully without a backoff request, reset the delay.
      backoffHelper.reset();
    }
  }
}

/**
 * Creates an async generator that yields a callback to trigger a backoff.
 * This is useful for `for-await-of` loops where you need fine-grained control.
 * The generator terminates when the `cancellationSignal` is set or the loop is terminated by break.
 *
 * @param options Options for backoff configuration and an optional cancellation signal.
 * @example
 * ```ts
 * const token = new CancellationToken();
 *
 * // with a cancellation signal
 * for await (const backoff of backoffGenerator({ cancellationSignal: token.signal })) {
 *   const success = await doSomeWork();
 *   if (!success) {
 *     backoff(); // Schedule a backoff before the next iteration.
 *   }
 * }
 *
 * // without a cancellation signal (loop is broken manually)
 * for await (const backoff of backoffGenerator()) {
 *   const success = await doSomeWork();
 *   if (success) {
 *     break; // Exit the loop
 *   }
 *   backoff();
 * }
 * ```
 */
export async function* backoffGenerator(options: BackoffGeneratorOptions = {}): AsyncIterableIterator<BackoffGeneratorCallback> {
  const { cancellationSignal, ...backoffOptions } = options;
  const backoffHelper = new BackoffHelper(backoffOptions);

  // Loop indefinitely if no cancellation signal is provided.
  // The consumer is responsible for breaking the loop.
  while (cancellationSignal?.isUnset ?? true) {
    let backoffTriggered = false;
    let timeoutSignal = cancellationSignal;

    const backoffCallback: BackoffGeneratorCallback = (backoffOptions?: { continueToken?: CancellationSignal }): void => {
      backoffTriggered = true;

      const continueToken = backoffOptions?.continueToken;

      if (isDefined(continueToken)) {
        timeoutSignal = isDefined(cancellationSignal)
          ? cancellationSignal.createChild().inherit(continueToken)
          : continueToken;
      }
    };

    yield backoffCallback;

    // Break immediately if the cancellation signal (if provided) is set.
    if (cancellationSignal?.isSet == true) {
      break;
    }

    if (backoffTriggered) {
      const delay = backoffHelper.getNextDelay();
      await cancelableTimeout(delay, timeoutSignal ?? NEVER);
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
      throw new Error(`Unknown backoff strategy: ${strategy as any}`);
  }

  return Math.min(newDelay, maximumDelay);
}
