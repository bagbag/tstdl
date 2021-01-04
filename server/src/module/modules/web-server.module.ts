import type { Logger } from '@tstdl/base/logger';
import type { CancellationToken } from '@tstdl/base/utils/cancellation-token';
import type * as Http from 'http';
import type { AnyRoute, HttpApi } from '../../api';
import { HttpServer } from '../../http';
import type { Module } from '../module';
import { ModuleMetricType } from '../module';
import { ModuleBase } from '../module-base';

export class WebServerModule extends ModuleBase implements Module {
  private readonly port: number;
  private readonly logger: Logger;
  private readonly httpServer: HttpServer;

  private requestCount: number;

  readonly httpApi: HttpApi;

  readonly metrics = {
    requestCount: {
      type: ModuleMetricType.Counter,
      getValue: () => this.requestCount
    },
    connectedSockets: {
      type: ModuleMetricType.Gauge,
      getValue: () => this.httpServer.connectedSocketsCount
    }
  };

  constructor(httpApi: HttpApi, port: number, logger: Logger) {
    super('WebServer');

    this.port = port;
    this.httpApi = httpApi;
    this.logger = logger;

    this.httpServer = new HttpServer(logger);
    this.requestCount = 0;
  }

  registerRoutes(...routes: AnyRoute[]): void {
    this.httpApi.registerRoutes(...routes);
  }

  protected async _run(cancellationToken: CancellationToken): Promise<void> {
    this.httpServer.server.on('request', (request: Http.IncomingMessage, response: Http.ServerResponse) => {
      this.httpApi.handleRequest(request, response);
      this.requestCount++;
    });

    this.httpServer.server.listen(this.port);
    this.logger.info(`listening on port ${this.port}`);

    await cancellationToken;

    this.logger.info('closing http server');
    await this.httpServer.close(3000);
  }
}
