/* eslint-disable no-console */

import { getCoreLogger } from '@tstdl/base/instance-provider';
import type { Logger } from '@tstdl/base/logger';
import { isDefined } from '@tstdl/base/utils';
import { CancellationToken } from '@tstdl/base/utils/cancellation-token';

type Signal = 'SIGTERM' | 'SIGINT' | 'SIGHUP' | 'SIGBREAK';
type QuitEvent = 'uncaughtException' | 'multipleResolves' | 'unhandledRejection' | 'rejectionHandled';

const QUIT_SIGNALS: Signal[] = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGBREAK'];
const QUIT_EVENTS: QuitEvent[] = ['uncaughtException' /* , 'multipleResolves' */, 'unhandledRejection', 'rejectionHandled'];

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

  for (const event of QUIT_EVENTS) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    process.on(event, (...args: any[]) => {
      console.error(event, ...args);
      quitReason = args;
      requestShutdown();
    });
  }

  for (const quitSignal of QUIT_SIGNALS) {
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
