import { Injector } from './injector/injector.js';
import type { InjectionToken } from './injector/token.js';
import { injectionToken } from './injector/token.js';
import { ConsoleLogger } from './logger/console/logger.js';
import type { LoggerArgument } from './logger/index.js';
import { LogLevel, Logger } from './logger/index.js';
import { initializeSignals, setProcessShutdownLogger } from './process-shutdown.js';
import type { ReadonlyCancellationToken } from './utils/cancellation-token.js';
import { timeout } from './utils/timing.js';
import { assertDefinedPass, isDefined } from './utils/type-guards.js';

export const CORE_LOGGER = injectionToken<Logger>('core logger');

export const rootInjector = new Injector('RootInjector');

let _isDevMode = true;

export function isDevMode(): boolean {
  return _isDevMode;
}

export function isProdMode(): boolean {
  return !_isDevMode;
}

export function enableProdMode(): void {
  _isDevMode = false;
}

export async function connect(name: string, connectFunction: (() => Promise<any>), logger: Logger, cancellationToken: ReadonlyCancellationToken, maxTries: number = 5): Promise<void> {
  let triesLeft = maxTries;
  let success = false;

  while (!success && cancellationToken.isUnset && triesLeft-- > 0) {
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

export type CoreConfiguration = {
  production?: boolean,
  logger?: InjectionToken<Logger, LoggerArgument>,
  logLevel?: LogLevel,
  coreLogPrefix?: string
};

let coreLogPrefix: string | undefined;

export function configureTstdl(config: CoreConfiguration = {}): void {
  if (config.production == true) {
    enableProdMode();
  }

  const logger = rootInjector.resolve(CORE_LOGGER);

  setProcessShutdownLogger(logger);
  initializeSignals();

  Injector.register(Logger, { useToken: config.logger ?? ConsoleLogger });

  Injector.registerSingleton<LogLevel, LogLevel>(
    LogLevel,
    { useFactory: (level) => assertDefinedPass(level, 'LogLevel argument not provided') },
    { defaultArgumentProvider: () => config.logLevel ?? LogLevel.Trace }
  );

  if (isDefined(config.coreLogPrefix)) {
    coreLogPrefix = config.coreLogPrefix;
  }
}

Injector.register(Logger, { useToken: ConsoleLogger });
Injector.register(LogLevel, { useValue: LogLevel.Trace });
Injector.register(CORE_LOGGER, { useToken: Logger, defaultArgumentProvider: () => coreLogPrefix });
