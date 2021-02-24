import { AsyncDisposer, disposeAsync } from './disposable';
import type { KeyValueStore, KeyValueStoreProvider } from './key-value';
import type { LockProvider } from './lock';
import type { Logger } from './logger';
import { LogLevel } from './logger';
import { ConsoleLogger } from './logger/console';
import type { StringMap } from './types';
import { deferThrow, singleton } from './utils';

const singletonScope = Symbol('singletons');
const coreLoggerToken = Symbol('core-logger');
const loggerProviderToken = Symbol('logger-provider');
const lockProviderToken = Symbol('lock-provider');
const keyValueStoreProviderToken = Symbol('key-value-store-provider');
const keyValueStoreSingletonScopeToken = Symbol('key-value-stores');

let coreLogPrefix = 'CORE';
let logLevel = LogLevel.Debug;
let loggerProvider: () => Logger = () => new ConsoleLogger(logLevel);

let lockProviderProvider: () => LockProvider | Promise<LockProvider> = deferThrow(new Error('LockProvider not configured'));

let keyValueStoreProviderProvider: () => KeyValueStoreProvider | Promise<KeyValueStoreProvider> = deferThrow(new Error('KeyValueStoreProvider not configured'));

export const disposer: AsyncDisposer = new AsyncDisposer();

export function configureBaseInstanceProvider(
  options: {
    coreLoggerPrefix?: string,
    logLevel?: LogLevel,
    loggerProvider?: () => Logger,
    lockProviderProvider?: () => LockProvider | Promise<LockProvider>,
    keyValueStoreProviderProvider?: () => KeyValueStoreProvider | Promise<KeyValueStoreProvider>
  }
): void {
  coreLogPrefix = options.coreLoggerPrefix ?? coreLogPrefix;
  logLevel = options.logLevel ?? logLevel;
  loggerProvider = options.loggerProvider ?? loggerProvider;
  lockProviderProvider = options.lockProviderProvider ?? lockProviderProvider;
  keyValueStoreProviderProvider = options.keyValueStoreProviderProvider ?? keyValueStoreProviderProvider;
}

export async function disposeInstances(): Promise<void> {
  getCoreLogger().debug('dispose instances');
  await disposer[disposeAsync]();
}

function getLoggerInstance(): Logger {
  return singleton(singletonScope, loggerProviderToken, () => {
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
  return singleton(singletonScope, coreLoggerToken, () => {
    const logger = getLogger(coreLogPrefix);
    return logger;
  });
}

export async function getLockProvider(): Promise<LockProvider> {
  return singleton(singletonScope, lockProviderToken, lockProviderProvider);
}

export async function getKeyValueStoreProvider(): Promise<KeyValueStoreProvider> {
  return singleton(singletonScope, keyValueStoreProviderToken, keyValueStoreProviderProvider);
}

export async function getKeyValueStore<KV extends StringMap>(scope: string): Promise<KeyValueStore<KV>> {
  return singleton(keyValueStoreSingletonScopeToken, scope, async () => {
    const provider = await getKeyValueStoreProvider();
    return provider.get(scope);
  });
}
