import { AsyncDisposer, disposeAsync } from './disposable';
import type { LockProvider } from './lock';
import type { Logger } from './logger';
import { LogLevel } from './logger';
import { ConsoleLogger } from './logger/console';
import { deferThrow, singleton } from './utils';

const coreLoggerToken = Symbol('core-logger');
const lockProviderToken = Symbol('lock-provider');

let coreLogPrefix = 'CORE';
let logLevel = LogLevel.Debug;
let loggerProvider: () => Logger = () => new ConsoleLogger(logLevel);

let lockProviderProvider: () => LockProvider | Promise<LockProvider> = deferThrow(new Error('LockProvider not configured'));

export const disposer: AsyncDisposer = new AsyncDisposer();

export function configureBaseInstanceProvider(
  options: {
    coreLoggerPrefix?: string,
    logLevel?: LogLevel,
    loggerProvider?: () => Logger,
    lockProviderProvider?: () => LockProvider | Promise<LockProvider>
  }
): void {
  coreLogPrefix = options.coreLoggerPrefix ?? coreLogPrefix;
  logLevel = options.logLevel ?? logLevel;
  loggerProvider = options.loggerProvider ?? loggerProvider;
  lockProviderProvider = options.lockProviderProvider ?? lockProviderProvider;
}

export async function disposeInstances(): Promise<void> {
  getCoreLogger().debug('dispose instances');
  await disposer[disposeAsync]();
}

function getLoggerInstance(): Logger {
  return singleton(ConsoleLogger, () => {
    const logger = loggerProvider();
    return logger;
  });
}

export function getLogger(prefix: string, autoFormat: boolean = true): Logger {
  const formattedPrefix = autoFormat ? `[${prefix}] ` : prefix;
  const logger = getLoggerInstance().prefix(formattedPrefix);

  return logger;
}

export function getCoreLogger(): Logger {
  return singleton(coreLoggerToken, () => {
    const logger = getLogger(coreLogPrefix);
    return logger;
  });
}

export async function getLockProvider(): Promise<LockProvider> {
  return singleton(lockProviderToken, lockProviderProvider);
}
