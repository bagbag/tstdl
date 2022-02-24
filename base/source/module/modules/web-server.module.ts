import type { Injectable } from '#/container';
import { injectArg, resolveArg, resolveArgumentType, singleton } from '#/container';
import type { ApiControllerImplementation, ApiDefinition } from '#/http-api';
import { HttpApiGateway } from '#/http-api';
import { HttpServer } from '#/http/server';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
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
export class WebServerModule extends ModuleBase implements Module, Injectable<WebServerModuleConfiguration> {
  private readonly config: WebServerModuleConfiguration;
  private readonly logger: Logger;
  private readonly httpServer: HttpServer;
  private readonly apiGateway: HttpApiGateway;

  readonly metrics = {
    connectedSockets: {
      type: ModuleMetricType.Gauge,
      getValue: () => this.httpServer.connectedSocketsCount
    }
  };

  [resolveArgumentType]: WebServerModuleConfiguration;

  constructor(@injectArg() config: WebServerModuleConfiguration, httpServer: HttpServer, apiGateway: HttpApiGateway, @resolveArg<LoggerArgument>(WebServerModule.name) logger: Logger) {
    super(WebServerModule.name);

    this.httpServer = httpServer;
    this.apiGateway = apiGateway;
    this.config = config;
    this.logger = logger;
  }

  registerApi<T extends ApiDefinition>(definition: T, implementation: ApiControllerImplementation<T>): void {
    this.apiGateway.registerApi(definition, implementation);
  }

  protected async _run(cancellationToken: ReadonlyCancellationToken): Promise<void> {
    await this.httpServer.listen(this.config.port);
    this.logger.info(`listening on port ${this.config.port}`);

    const closePromise = cancellationToken.$set.then(async () => {
      this.logger.info('closing http server');
      return this.httpServer.close(3000);
    });

    for await (const context of this.httpServer) {
      void this.apiGateway.handleHttpServerRequestContext(context);
    }

    await closePromise;
  }
}

export function configureWebServerModule(config?: WebServerModuleConfiguration): void {
  webServerModuleConfiguration.port = config?.port ?? webServerModuleConfiguration.port;
}
