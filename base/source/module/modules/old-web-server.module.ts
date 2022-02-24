import type { NodeHttpServer } from '#/http/server/node';
import type { Logger } from '#/logger';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import type { AnyRoute, HttpApi } from '../../api/http-api';
import type { Module } from '../module';
import { ModuleMetricType } from '../module';
import { ModuleBase } from '../module-base';

export class OldWebServerModule extends ModuleBase implements Module {
  private readonly port: number;
  private readonly logger: Logger;
  private readonly httpServer: NodeHttpServer;

  readonly httpApi: HttpApi;

  readonly metrics = {
    connectedSockets: {
      type: ModuleMetricType.Gauge,
      getValue: () => this.httpServer.connectedSocketsCount
    }
  };

  constructor(httpServer: NodeHttpServer, httpApi: HttpApi, port: number, logger: Logger) {
    super('WebServer');

    this.port = port;
    this.httpServer = httpServer;
    this.httpApi = httpApi;
    this.logger = logger;
  }

  registerRoutes(...routes: AnyRoute[]): void {
    this.httpApi.registerRoutes(...routes);
  }

  protected async _run(cancellationToken: ReadonlyCancellationToken): Promise<void> {
    await this.httpServer.listen(this.port);
    this.logger.info(`listening on port ${this.port}`);

    const closePromise = cancellationToken.$set.then(async () => {
      this.logger.info('closing http server');
      return this.httpServer.close(3000);
    });

    for await (const context of this.httpServer) {
      this.httpApi.handleRequest(context.context.nodeRequest, context.context.nodeResponse);
    }

    await closePromise;
  }
}
