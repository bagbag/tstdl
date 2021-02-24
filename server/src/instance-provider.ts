import { NotFoundError, UnauthorizedError, ValidationError } from '@tstdl/base/error';
import { disposer, getLockProvider, getLogger } from '@tstdl/base/instance-provider';
import type { Logger } from '@tstdl/base/logger';
import { singleton, timeout } from '@tstdl/base/utils';
import { deferThrow } from '@tstdl/base/utils/helpers';
import { HttpApi } from './api';
import { DistributedLoopProvider } from './distributed-loop';
import type { MigrationStateRepository } from './migration';
import { Migrator } from './migration';
import { WebServerModule } from './module/modules';

const singletonScope = Symbol('singletons');

let migrationLogPrefix = 'MIGRATION';
let migrationStateRepositoryProvider: () => MigrationStateRepository | Promise<MigrationStateRepository> = deferThrow(new Error('migrationStateRepository not configured'));

let httpApiUrlPrefix = '';
let httpApiBehindProxy = true;
let httpApiLogPrefix = 'HTTP';

let webServerPort = 8080;
let webServerLogPrefix = 'WEBSERVER';

export function configureServerInstanceProvider(
  options: {
    webServerPort?: number,
    httpApiUrlPrefix?: string,
    httpApiBehindProxy?: boolean,
    httpApiLogPrefix?: string,
    webServerLogPrefix?: string,
    migrationLogPrefix?: string,
    migrationStateRepositoryProvider?: () => MigrationStateRepository | Promise<MigrationStateRepository>
  }
): void {
  webServerPort = options.webServerPort ?? webServerPort;
  httpApiUrlPrefix = options.httpApiUrlPrefix ?? httpApiUrlPrefix;
  httpApiBehindProxy = options.httpApiBehindProxy ?? httpApiBehindProxy;
  httpApiLogPrefix = options.httpApiLogPrefix ?? httpApiLogPrefix;
  webServerLogPrefix = options.webServerLogPrefix ?? webServerLogPrefix;
  migrationLogPrefix = options.migrationLogPrefix ?? migrationLogPrefix;
  migrationStateRepositoryProvider = options.migrationStateRepositoryProvider ?? migrationStateRepositoryProvider;
}

export async function getMigrator(): Promise<Migrator> {
  return singleton(singletonScope, Migrator, async () => {
    const migrationStateRepository = await migrationStateRepositoryProvider();
    const lockProvider = await getLockProvider();
    const logger = getLogger(migrationLogPrefix);

    return new Migrator(migrationStateRepository, lockProvider, logger);
  });
}


export async function getDistributedLoopProvider(): Promise<DistributedLoopProvider> {
  return singleton(singletonScope, DistributedLoopProvider, async () => {
    const lockProvider = await getLockProvider();
    return new DistributedLoopProvider(lockProvider);
  });
}

export function getHttpApi(): HttpApi {
  return singleton(singletonScope, HttpApi, () => {
    const logger = getLogger(httpApiLogPrefix);
    const httpApi = new HttpApi({ logger, behindProxy: true });

    httpApi.supressErrorLog(UnauthorizedError, NotFoundError, ValidationError);

    return httpApi;
  });
}

export function getWebServerModule(): WebServerModule {
  return singleton(singletonScope, WebServerModule, () => {
    const httpApi = getHttpApi();
    const logger = getLogger(webServerLogPrefix);

    return new WebServerModule(httpApi, webServerPort, logger);
  });
}

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
