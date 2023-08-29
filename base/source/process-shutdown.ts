/* eslint-disable no-console */

import type { CancellationSignal } from '#/cancellation/index.js';
import { CancellationToken } from '#/cancellation/index.js';
import type { Logger } from '#/logger/index.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';

type Signal = 'SIGTERM' | 'SIGINT' | 'SIGHUP' | 'SIGBREAK';
type QuitEvent = 'uncaughtException' | 'multipleResolves' | 'unhandledRejection' | 'rejectionHandled';

const quitSignals: Signal[] = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGBREAK'];
const quitEvents: QuitEvent[] = ['uncaughtException' /* , 'multipleResolves' */, 'unhandledRejection', 'rejectionHandled'];

let shutdownToken: CancellationToken | undefined;

export function getShutdownToken(): CancellationToken {
  if (isUndefined(shutdownToken)) {
    shutdownToken = new CancellationToken();
  }

  return shutdownToken;
}

export function getShutdownSignal(): CancellationSignal {
  return getShutdownToken().signal;
}

let logger: Logger;

// eslint-disable-next-line no-shadow
export function setProcessShutdownLogger(shutdownLogger: Logger): void {
  logger = shutdownLogger;
}

let shutdownRequested = false;

export function requestShutdown(exitCode: number = 1): void {
  if (shutdownRequested) {
    return;
  }

  shutdownRequested = true;
  getShutdownToken().set();

  const timeout = setTimeout(() => {
    logger.warn('forcefully quitting after 20 seconds...');
    setTimeout(() => process.exit(exitCode), 1);
  }, 20000);

  timeout.unref();
}

export function forceShutdown(exitCode: number = 1): void {
  logger.warn('forcefully quitting');
  setTimeout(() => process.exit(exitCode), 1);
}

let signalsInitialized = false;

export function initializeSignals(): void {
  if (signalsInitialized || (typeof process == 'undefined')) {
    return;
  }

  signalsInitialized = true;

  let signalCounter = 0;
  let quitReason: any[] | undefined;

  process.on('beforeExit', () => {
    if (isDefined(quitReason)) {
      console.info('\nquit reason:', ...quitReason);
    }
  });

  for (const event of quitEvents) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    process.on(event, (...args: any[]) => {
      console.error(event, ...args);
      quitReason = args;
      requestShutdown();
    });
  }

  for (const quitSignal of quitSignals) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    process.on(quitSignal, (signal) => {
      logger.info(`${signal} received, quitting.`);
      requestShutdown();

      if (++signalCounter > 1) {
        forceShutdown();
      }
    });
  }
}
