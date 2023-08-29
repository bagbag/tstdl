import { API_CONTROLLERS, ApiGateway, getApiControllerDefinition } from '#/api/server/index.js';
import type { CancellationSignal } from '#/cancellation/index.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { HttpServer } from '#/http/server/http-server.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { resolveArgumentType } from '#/injector/interfaces.js';
import { ModuleBase } from '../module-base.js';
import type { Module } from '../module.js';
import { ModuleMetricType } from '../module.js';

export type WebServerModuleConfiguration = {
  port: number
};

export const webServerModuleConfiguration: WebServerModuleConfiguration = {
  port: 8000
};

@Singleton({ defaultArgumentProvider: () => webServerModuleConfiguration })
export class WebServerModule extends ModuleBase implements Module, Resolvable<WebServerModuleConfiguration> {
  private readonly config = injectArgument(this);
  private readonly httpServer = inject(HttpServer);
  private readonly apiGateway = inject(ApiGateway);
  private readonly apiControllers = inject(API_CONTROLLERS);

  private initialized = false;

  readonly metrics = {
    connectedSockets: {
      type: ModuleMetricType.Gauge,
      getValue: () => this.httpServer.connectedSocketsCount
    }
  };

  declare readonly [resolveArgumentType]: WebServerModuleConfiguration;
  constructor() {
    super('WebServer');
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    for (const controller of this.apiControllers) {
      this.apiGateway.registerApi(getApiControllerDefinition(controller), controller);
    }
  }

  protected async _run(cancellationSignal: CancellationSignal): Promise<void> {
    this.initialize();

    await this.httpServer.listen(this.config.port);

    const closePromise = cancellationSignal.$set.then(async () => {
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
