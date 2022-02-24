import { HttpApi } from './api/http-api';
import { container } from './container';
import { CORE_LOGGER } from './core';
import { NodeHttpServer } from './http/server/node';
import { Logger } from './logger';
import { OldWebServerModule, WebServerModule } from './module/modules';
import type { Type } from './types';
import { singleton } from './utils/singleton';

const singletonScope = Symbol('singletons');

let migrationLogPrefix = 'MIGRATION';
let supressErrorLog: Type<Error>[] = [];

let httpApiUrlPrefix = '';
let httpApiBehindProxy = true;
let httpApiLogPrefix = 'HTTP';

let webServerPort = 8080;
let webServerLogPrefix = 'WEBSERVER';

export function configureBaseInstanceProvider(
  options: {
    webServerPort?: number,
    httpApiUrlPrefix?: string,
    httpApiBehindProxy?: boolean,
    httpApiLogPrefix?: string,
    webServerLogPrefix?: string,
    migrationLogPrefix?: string,
    supressErrorLog?: Type<Error>[]
  }
): void {
  webServerPort = options.webServerPort ?? webServerPort;
  httpApiUrlPrefix = options.httpApiUrlPrefix ?? httpApiUrlPrefix;
  httpApiBehindProxy = options.httpApiBehindProxy ?? httpApiBehindProxy;
  httpApiLogPrefix = options.httpApiLogPrefix ?? httpApiLogPrefix;
  webServerLogPrefix = options.webServerLogPrefix ?? webServerLogPrefix;
  migrationLogPrefix = options.migrationLogPrefix ?? migrationLogPrefix;
  supressErrorLog = options.supressErrorLog ?? supressErrorLog;
}

export function getLogger(module: string): Logger {
  return container.resolve(Logger, module);
}

export function getCoreLogger(): Logger {
  return container.resolve(CORE_LOGGER);
}

export function getHttpApi(): HttpApi {
  return singleton(singletonScope, HttpApi, () => {
    const logger = getLogger(httpApiLogPrefix);
    const httpApi = new HttpApi({ logger, behindProxy: httpApiBehindProxy });

    httpApi.supressErrorLog(...supressErrorLog);

    return httpApi;
  });
}

export function getWebServerModule(): OldWebServerModule {
  return singleton(singletonScope, WebServerModule, () => {
    const httpServer = container.resolve(NodeHttpServer);
    const httpApi = getHttpApi();
    const logger = getLogger(webServerLogPrefix);

    return new OldWebServerModule(httpServer, httpApi, webServerPort, logger);
  });
}
