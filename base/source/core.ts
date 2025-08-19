import type { CancellationSignal } from './cancellation/token.js';
import { Injector } from './injector/injector.js';
import { injectionToken, type InjectionToken } from './injector/token.js';
import { ConsoleLogger } from './logger/console/logger.js';
import { LogLevel, Logger, type LoggerArgument } from './logger/index.js';
import { LOG_LEVEL } from './logger/tokens.js';
import { initializeSignals, setProcessShutdownLogger } from './process-shutdown.js';
import { timeout } from './utils/timing.js';
import { assertDefinedPass, isDefined } from './utils/type-guards.js';

declare global {
  var tstdlLoaded: boolean | undefined;
}

if (globalThis.tstdlLoaded == true) {
  console.error(new Error('tstdl seems to be loaded multiple times. This is likely an error as some modules won\'t work as intended this way.'));
}

globalThis.tstdlLoaded = true;

export const CORE_LOGGER = injectionToken<Logger>('core logger');

let globalInjector: Injector | undefined;

let _isDevMode = true;

/**
 * @deprecated Usage of `getGlobalInjector` should be avoided. Use `Application` scoped injector instead.
 */
export function getGlobalInjector(): Injector {
  return globalInjector ??= new Injector('GlobalInjector');
}

export function isDevMode(): boolean {
  return _isDevMode;
}

export function isProdMode(): boolean {
  return !_isDevMode;
}

export function enableProdMode(): void {
  _isDevMode = false;
}

export async function connect(name: string, connectFunction: (() => Promise<any>), logger: Logger, cancellationSignal: CancellationSignal, maxTries: number = 5): Promise<void> {
  let triesLeft = maxTries;
  let success = false;

  while (!success && cancellationSignal.isUnset && triesLeft-- > 0) {
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

  const logger = getGlobalInjector().resolve(CORE_LOGGER);

  setProcessShutdownLogger(logger);
  initializeSignals();

  Injector.register(Logger, { useToken: config.logger ?? ConsoleLogger });

  Injector.register<LogLevel, LogLevel>(
    LOG_LEVEL,
    { useFactory: (level) => assertDefinedPass(level, 'LogLevel argument not provided') },
    { defaultArgumentProvider: () => config.logLevel ?? LogLevel.Trace }
  );

  if (isDefined(config.coreLogPrefix)) {
    coreLogPrefix = config.coreLogPrefix;
  }
}

Injector.register(Logger, { useToken: ConsoleLogger });
Injector.register(LOG_LEVEL, { useValue: LogLevel.Trace });
Injector.register(CORE_LOGGER, { useToken: Logger, defaultArgumentProvider: () => coreLogPrefix });
