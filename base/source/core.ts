import type { InjectionToken } from './container';
import { container } from './container';
import { AsyncDisposer } from './disposable';
import type { LoggerArgument } from './logger';
import { Logger, LogLevel } from './logger';
import { ConsoleLogger } from './logger/console';
import { timeout } from './utils/timing';

let logLevel = LogLevel.Debug;
let loggerToken: InjectionToken<Logger, LoggerArgument> = ConsoleLogger;

export const disposer: AsyncDisposer = new AsyncDisposer();

export async function connect(name: string, connectFunction: (() => Promise<any>), logger: Logger, maxTries: number = 3): Promise<void> {
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

      await timeout(2000);
    }
  }
}

export async function disposeInstances(): Promise<void> {
  const logger = await container.resolveAsync(Logger);

  logger.info('shutting down');
  await disposer.dispose();
}

export type CoreConfiguration = {
  logLevel?: LogLevel,
  loggerToken?: InjectionToken<Logger, LoggerArgument>
};

export function configureTstdl(config: CoreConfiguration): void {
  logLevel = config.logLevel ?? logLevel;
  loggerToken = config.loggerToken ?? loggerToken;
}

container.registerSingleton<LogLevel, LogLevel>(
  LogLevel,
  { useFactory: (level) => level ?? LogLevel.Trace },
  { defaultArgumentProvider: () => logLevel }
);

container.registerSingleton(Logger, { useTokenProvider: () => loggerToken });
