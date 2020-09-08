import type { Logger } from '@tstdl/base/logger';
import { cancelableTimeout, Timer } from '@tstdl/base/utils';
import * as Http from 'http';
import type { Socket } from 'net';

export class HttpServer {
  private readonly logger: Logger;
  private readonly sockets: Set<Socket>;

  private untrackConnectedSockets: () => void;

  readonly server: Http.Server;

  get connectedSockets(): Iterable<Socket> {
    return this.sockets.values();
  }

  constructor(logger: Logger) {
    this.logger = logger;

    this.server = new Http.Server();
    this.sockets = new Set();
  }

  async listen(port: number): Promise<void> {
    if (this.server.listening) {
      throw new Error('already listening');
    }

    this.server.listen(port);

    return new Promise<void>((resolve, reject) => {
      let listeningListener: () => void;
      let errorListener: (error: Error) => void; // eslint-disable-line prefer-const

      listeningListener = () => { // eslint-disable-line prefer-const
        this.untrackConnectedSockets = trackConnectedSockets(this.server, this.sockets);
        this.server.removeListener('error', errorListener);
        resolve();
      };

      errorListener = (error: Error) => {
        this.server.removeListener('listening', listeningListener);
        reject(error);
      };

      this.server.once('listening', listeningListener);
      this.server.once('error', errorListener);
    });
  }

  async close(timeout: number): Promise<void> {
    const timer = new Timer(true);

    const closePromise = new Promise<void>((resolve, reject) => this.server.close((error) => (error != undefined ? reject(error) : resolve(undefined))));

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const connections = await getConnectionsCount(this.server);

      if (connections == 0) {
        break;
      }

      if (timer.milliseconds >= timeout) {
        this.logger.info(`force closing of ${connections} remaining sockets after waiting for ${timeout} milliseconds`);
        destroySockets(this.sockets);
        break;
      }

      if (connections > 0) {
        this.logger.info(`waiting for ${connections} connections to end`);
        await cancelableTimeout(1000, closePromise);
      }
    }

    this.untrackConnectedSockets();
  }

  registerRequestHandler(handler: (request: Http.IncomingMessage, response: Http.ServerResponse) => void): void {
    this.server.on('request', handler);
  }
}

function trackConnectedSockets(server: Http.Server, sockets: Set<Socket>): () => void {
  const connectionListener = (socket: Socket): void => {
    sockets.add(socket);

    const closeListener = (): void => {
      sockets.delete(socket);
      socket.removeListener('close', closeListener);
    };

    socket.on('close', closeListener);
  };

  server.on('connection', connectionListener);

  return () => server.removeListener('connection', connectionListener);
}

async function getConnectionsCount(server: Http.Server): Promise<number> {
  return new Promise<number>((resolve, reject) => server.getConnections((error, count) => (error != undefined ? reject(error) : resolve(count))));
}

function destroySockets(sockets: Iterable<Socket>): void {
  for (const socket of sockets) {
    socket.destroy();
  }
}
