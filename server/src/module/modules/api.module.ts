import { Enumerable } from '@tstdl/base/enumerable';
import type { Logger } from '@tstdl/base/logger';
import { cancelableTimeout, Timer } from '@tstdl/base/utils';
import type { CancellationToken } from '@tstdl/base/utils/cancellation-token';
import * as Http from 'http';
import type * as Net from 'net';
import type { AnyRoute, HttpApi } from '../../api';
import { ModuleMetricType } from '../module';
import type { Module } from '../module';
import { ModuleBase } from '../module-base';

export class ApiModule extends ModuleBase implements Module {
  private readonly port: number;
  private readonly logger: Logger;
  private readonly socketsSets: Set<Set<Net.Socket>>;

  private requestCount: number;

  readonly httpApi: HttpApi;

  readonly metrics = {
    requestCount: {
      type: ModuleMetricType.Counter,
      getValue: () => this.requestCount // eslint-disable-line no-invalid-this
    },
    connectedSockets: {
      type: ModuleMetricType.Gauge,
      getValue: () => Enumerable.from(this.socketsSets).reduce((sum, set) => sum + set.size, 0) // eslint-disable-line no-invalid-this
    }
  };

  constructor(httpApi: HttpApi, port: number, logger: Logger) {
    super('Api');

    this.port = port;
    this.httpApi = httpApi;
    this.logger = logger;

    this.socketsSets = new Set();
    this.requestCount = 0;
  }

  registerRoutes(...routes: AnyRoute[]): void {
    this.httpApi.registerRoutes(...routes);
  }

  protected async _run(cancellationToken: CancellationToken): Promise<void> {
    const server = new Http.Server();
    const sockets = new Set<Net.Socket>();

    this.socketsSets.add(sockets);

    trackConnectedSockets(server, sockets);

    server.on('request', (request: Http.IncomingMessage, response: Http.ServerResponse) => {
      this.httpApi.handleRequest(request, response);
      this.requestCount++;
    });

    server.listen(this.port);
    this.logger.info(`listening on port ${this.port}`);

    await cancellationToken;

    this.logger.info('closing http server');
    await this.closeServer(server, sockets, 3000);

    this.socketsSets.delete(sockets);
  }

  private async closeServer(server: Http.Server, sockets: Set<Net.Socket>, timeout: number): Promise<void> {
    const timer = new Timer(true);

    const closePromise = new Promise<void>((resolve, _reject) => server.close(() => resolve(undefined)));

    while (true) {
      const connections = await getConnections(server);

      if (connections == 0) {
        break;
      }

      if (timer.milliseconds >= timeout) {
        this.logger.info(`force closing remaining sockets after waiting for ${timeout} milliseconds`);
        destroySockets(sockets);
        break;
      }

      if (connections > 0) {
        this.logger.info(`waiting for ${connections} to end`);
        await cancelableTimeout(1000, closePromise);
      }
    }
  }
}

function trackConnectedSockets(server: Net.Server, sockets: Set<Net.Socket>): void {
  server.on('connection', (socket) => {
    sockets.add(socket);

    socket.on('close', () => {
      sockets.delete(socket);
    });
  });
}

async function getConnections(server: Http.Server): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    server.getConnections((error, count) => {
      if (error != undefined) {
        reject(error);
        return;
      }

      resolve(count);
    });
  });
}

function destroySockets(sockets: Iterable<Net.Socket>): void {
  for (const socket of sockets) {
    socket.destroy();
  }
}
