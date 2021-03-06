/* eslint-disable no-console */

import { getCoreLogger } from '#/instance-provider';
import type { Logger } from '#/logger';
import { isDefined } from '#/utils';
import { CancellationToken } from '#/utils/cancellation-token';

type Signal = 'SIGTERM' | 'SIGINT' | 'SIGHUP' | 'SIGBREAK';
type QuitEvent = 'uncaughtException' | 'multipleResolves' | 'unhandledRejection' | 'rejectionHandled';

const quitSignals: Signal[] = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGBREAK'];
const quitEvents: QuitEvent[] = ['uncaughtException' /* , 'multipleResolves' */, 'unhandledRejection', 'rejectionHandled'];

export const shutdownToken = new CancellationToken();

let logger: Logger = getCoreLogger();

// eslint-disable-next-line no-shadow
export function setProcessShutdownLogger(shutdownLogger: Logger): void {
  logger = shutdownLogger;
}

let requested = false;

let quitReason: any[] | undefined;

process.on('beforeExit', () => {
  if (isDefined(quitReason)) {
    console.info('quit reason:', ...quitReason);
  }
});

export function requestShutdown(): void {
  if (requested) {
    return;
  }

  requested = true;
  shutdownToken.set();

  const timeout = setTimeout(() => {
    logger.warn('forcefully quitting after 20 seconds...');
    setTimeout(() => process.exit(1), 1);
  }, 20000);

  timeout.unref();
}

export function forceShutdown(): void {
  logger.warn('forcefully quitting');
  setTimeout(() => process.exit(2), 1);
}

export function initializeSignals(): void {
  let signalCounter = 0;

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
