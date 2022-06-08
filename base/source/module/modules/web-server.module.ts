import { ApiGateway, API_MODULE_OPTIONS } from '#/api/server';
import type { AfterResolve, Injectable } from '#/container';
import { afterResolve, inject, injectArg, optional, resolveArgumentType, singleton } from '#/container';
import { disposeAsync } from '#/disposable/disposable';
import { HttpServer } from '#/http/server';
import type { Type } from '#/types';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import type { Module } from '../module';
import { ModuleMetricType } from '../module';
import { ModuleBase } from '../module-base';

export type WebServerModuleConfiguration = {
  port: number
};

export const webServerModuleConfiguration: WebServerModuleConfiguration = {
  port: 8000
};

@singleton({ defaultArgumentProvider: () => webServerModuleConfiguration })
export class WebServerModule extends ModuleBase implements Module, Injectable<WebServerModuleConfiguration>, AfterResolve {
  private readonly config: WebServerModuleConfiguration;
  private readonly httpServer: HttpServer;
  private readonly apiGateway: ApiGateway;
  private readonly apiControllers: Type[];

  private initialized: boolean;

  readonly metrics = {
    connectedSockets: {
      type: ModuleMetricType.Gauge,
      getValue: () => this.httpServer.connectedSocketsCount
    }
  };

  [resolveArgumentType]: WebServerModuleConfiguration;

  constructor(
    @injectArg() config: WebServerModuleConfiguration,
    httpServer: HttpServer,
    apiGateway: ApiGateway,
    @inject(API_MODULE_OPTIONS, undefined, (options) => options.controllers) @optional() apiControllers: Type[] = []
  ) {
    super('WebServer');

    this.httpServer = httpServer;
    this.apiGateway = apiGateway;
    this.config = config;
    this.apiControllers = apiControllers;

    this.initialized = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    for (const controller of this.apiControllers) {
      await this.registerApiController(controller);
    }
  }

  async [afterResolve](): Promise<void> {
    await this.initialize();
  }

  async registerApiController(controller: Type): Promise<void> {
    await this.apiGateway.registerApiController(controller);
  }

  protected async _run(cancellationToken: ReadonlyCancellationToken): Promise<void> {
    await this.initialize();

    await this.httpServer.listen(this.config.port);

    const closePromise = cancellationToken.$set.then(async () => {
      await this.httpServer[disposeAsync]();
    });

    for await (const context of this.httpServer) {
      void this.apiGateway.handleHttpServerRequestContext(context);
    }

    await closePromise;
  }
}

export function configureWebServerModule(config?: Partial<WebServerModuleConfiguration>): void {
  webServerModuleConfiguration.port = config?.port ?? webServerModuleConfiguration.port;
}
