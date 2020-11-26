import { AsyncDisposer, disposeAsync } from './disposable';
import type { Logger } from './logger';
import { LogLevel } from './logger';
import { ConsoleLogger } from './logger/console';
import { singleton } from './utils';

const disposer: AsyncDisposer = new AsyncDisposer();
const coreLoggerToken = Symbol('core-logger');

let coreLogPrefix = '[CORE]';
let logLevel = LogLevel.Debug;
let loggerProvider: () => Logger = () => new ConsoleLogger(logLevel);

export function configureBaseInstanceProvider(
  options: {
    coreLoggerPrefix?: string,
    logLevel?: LogLevel,
    loggerProvider?: () => Logger
  }
): void {
  coreLogPrefix = options.coreLoggerPrefix ?? coreLogPrefix;
  logLevel = options.logLevel ?? logLevel;
  loggerProvider = options.loggerProvider ?? loggerProvider;
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
