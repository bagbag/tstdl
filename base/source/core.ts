import type { InjectionToken } from './container';
import { container, injectionToken } from './container';
import { AsyncDisposer } from './disposable';
import type { LoggerArgument } from './logger';
import { Logger, LogLevel } from './logger';
import { ConsoleLogger } from './logger/console';
import { timeout } from './utils/timing';

let coreLogPrefix = 'CORE';
let logLevel = LogLevel.Debug;
let loggerToken: InjectionToken<Logger, LoggerArgument> = ConsoleLogger;

export const CORE_LOGGER = injectionToken<Logger>('CORE_LOGGER');

export const disposer: AsyncDisposer = new AsyncDisposer();

export async function connect(name: string, connectFunction: (() => Promise<any>), logger: Logger, maxTries: number = 5): Promise<void> {
  let triesLeft = maxTries;
  let success = false;

  while (!success && !disposer.disposing && triesLeft-- > 0) {
    try {
      logger.verbose(`connecting to ${name}...`);

      await connectFunction();
      success = true;

      logger.info(`connected to ${name}`);
    }
    catch (error: unknown) {
      logger.verbose(`error connecting to ${name} (${(error as Error).message})${triesLeft > 0 ? ', trying again...' : ''}`);

      if (triesLeft == 0) {
        throw new Error(`failed to connect to ${name} - no tries left`);
      }

      await timeout(3000);
    }
  }
}

export async function disposeInstances(): Promise<void> {
  await disposer.dispose();
}

export type CoreConfiguration = {
  coreLogPrefix?: string,
  logLevel?: LogLevel,
  loggerToken?: InjectionToken<Logger, LoggerArgument>
};

export function configureTstdl(config?: CoreConfiguration): void {
  coreLogPrefix = config?.coreLogPrefix ?? coreLogPrefix;
  logLevel = config?.logLevel ?? logLevel;
  loggerToken = config?.loggerToken ?? loggerToken;
}

container.register(CORE_LOGGER, { useToken: Logger, argumentProvider: () => coreLogPrefix });

container.registerSingleton<LogLevel, LogLevel>(
  LogLevel,
  { useFactory: (level) => level ?? LogLevel.Trace },
  { defaultArgumentProvider: () => logLevel }
);

container.register(Logger, { useTokenProvider: () => loggerToken });
