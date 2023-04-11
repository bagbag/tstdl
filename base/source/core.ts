import type { InjectionToken } from './container/index.js';
import { container, injectionToken } from './container/index.js';
import { AsyncDisposer } from './disposable/async-disposer.js';
import { ConsoleLogger } from './logger/console/logger.js';
import type { LoggerArgument } from './logger/index.js';
import { Logger, LogLevel } from './logger/index.js';
import { timeout } from './utils/timing.js';
import { assertDefinedPass, isDefined } from './utils/type-guards.js';

export const CORE_LOGGER = injectionToken<Logger>('core logger');

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
      logger.verbose(`error connecting to ${name}${triesLeft > 0 ? ', trying again...' : ''}`);
      logger.error(error as Error);

      if (triesLeft == 0) {
        throw new Error(`Failed to connect to ${name} - no tries left.`);
      }

      await timeout(3000);
    }
  }
}

export async function disposeInstances(): Promise<void> {
  await disposer.dispose();
}

export type CoreConfiguration = {
  logger?: InjectionToken<Logger, LoggerArgument>,
  logLevel?: LogLevel,
  coreLogPrefix?: string;
};

let coreLogPrefix: string | undefined;

export function configureTstdl(config: CoreConfiguration = {}): void {
  container.register(Logger, { useToken: config.logger ?? ConsoleLogger });

  container.registerSingleton<LogLevel, LogLevel>(
    LogLevel,
    { useFactory: (level) => assertDefinedPass(level, 'LogLevel argument not provided') },
    { defaultArgumentProvider: () => config.logLevel ?? LogLevel.Trace }
  );

  if (isDefined(config.coreLogPrefix)) {
    coreLogPrefix = config.coreLogPrefix;
  }
}

container.register(Logger, { useToken: ConsoleLogger });
container.register(LogLevel, { useValue: LogLevel.Trace });
container.register(CORE_LOGGER, { useToken: Logger, argumentProvider: () => coreLogPrefix });
