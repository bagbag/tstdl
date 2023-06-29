import type { ServerResponse } from 'node:http';
import * as Http from 'node:http';
import type { Socket } from 'node:net';

import type { AfterResolve } from '#/container/index.js';
import { afterResolve, resolveArg, singleton } from '#/container/index.js';
import { disposer } from '#/core.js';
import type { AsyncDisposable } from '#/disposable/index.js';
import { disposeAsync } from '#/disposable/index.js';
import { HttpHeaders } from '#/http/http-headers.js';
import { HttpQuery } from '#/http/http-query.js';
import type { HttpMethod } from '#/http/types.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { CancellationToken } from '#/utils/cancellation-token.js';
import { encodeUtf8 } from '#/utils/encoding.js';
import { FeedableAsyncIterable } from '#/utils/feedable-async-iterable.js';
import { getReadableStreamIterable } from '#/utils/stream/readable-stream-adapter.js';
import { Timer } from '#/utils/timer.js';
import { cancelableTimeout } from '#/utils/timing.js';
import { isDefined, isNullOrUndefined, isString } from '#/utils/type-guards.js';
import { bindNodeCallback, share } from 'rxjs';
import { HttpServerRequest } from '../http-server-request.js';
import type { HttpServerResponse } from '../http-server-response.js';
import type { HttpServerRequestContext } from '../http-server.js';
import { HttpServer } from '../http-server.js';

type RequestItem = { request: Http.IncomingMessage, response: Http.ServerResponse };

export type NodeHttpServerContext = { nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse };

@singleton()
export class NodeHttpServer extends HttpServer<NodeHttpServerContext> implements AsyncDisposable, AfterResolve {
  private readonly httpServer: Http.Server;
  private readonly sockets: Set<Socket>;
  private readonly requestIterable: FeedableAsyncIterable<RequestItem>;
  private readonly logger: Logger;

  private untrackConnectedSockets?: () => void;

  get connectedSocketsCount(): number {
    return this.sockets.size;
  }

  constructor(@resolveArg<LoggerArgument>('NodeHttpServer') logger: Logger) {
    super();

    this.logger = logger;

    this.httpServer = new Http.Server();
    this.sockets = new Set();
    this.requestIterable = new FeedableAsyncIterable();

    this.httpServer.on('request', (request: Http.IncomingMessage, response: Http.ServerResponse) => {
      this.logger.verbose(`${request.method} from "${request.socket.remoteAddress}" to "${request.url}"`);
      this.requestIterable.feed({ request, response });
    });
  }

  [afterResolve](): void {
    disposer.add(() => this[disposeAsync]);
  }

  async [disposeAsync](): Promise<void> {
    await this.close(3000);
    this.requestIterable.end();
  }

  async listen(port: number): Promise<void> {
    if (this.httpServer.listening) {
      throw new Error('http server is already listening');
    }

    this.httpServer.listen(port);

    return new Promise<void>((resolve, reject) => {
      let listeningListener: () => void;
      let errorListener: (error: Error) => void; // eslint-disable-line prefer-const

      listeningListener = () => { // eslint-disable-line prefer-const
        this.logger.info(`Listening on port ${port}`);
        this.untrackConnectedSockets = trackConnectedSockets(this.httpServer, this.sockets);
        this.httpServer.removeListener('error', errorListener);
        resolve();
      };

      errorListener = (error: Error) => {
        this.httpServer.removeListener('listening', listeningListener);
        reject(error);
      };

      this.httpServer.once('listening', listeningListener);
      this.httpServer.once('error', errorListener);
    });
  }

  async close(timeout: number): Promise<void> {
    this.logger.info('Closing http server');

    const timer = new Timer(true);

    const close$ = bindNodeCallback(this.httpServer.close.bind(this.httpServer))().pipe(share());
    close$.subscribe();

    while (true) {
      const connections = await getConnectionsCount(this.httpServer);

      if (connections == 0) {
        break;
      }

      if (timer.milliseconds >= timeout) {
        this.logger.info(`Force closing of ${connections} remaining sockets after waiting for ${timeout} milliseconds`);
        destroySockets(this.sockets);
        break;
      }

      if (connections > 0) {
        this.logger.info(`Waiting for ${connections} connections to end`);
        await cancelableTimeout(250, CancellationToken.from(close$));
      }
    }

    this.untrackConnectedSockets?.();
    this.untrackConnectedSockets = undefined;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<HttpServerRequestContext<NodeHttpServerContext>> {
    for await (const { request, response } of this.requestIterable) {
      yield this.handleRequest(request, response);
    }
  }

  private handleRequest(request: Http.IncomingMessage, response: Http.ServerResponse): HttpServerRequestContext<NodeHttpServerContext> {
    const method = request.method as HttpMethod;
    const url = new URL(request.url!, `http://${request.headers.host}`);

    const headers = new HttpHeaders(request.headers);
    const query = HttpQuery.fromURLSearchParams(url.searchParams);

    const context: NodeHttpServerContext = { nodeRequest: request, nodeResponse: response };

    const httpRequest = new HttpServerRequest({
      url,
      method,
      headers,
      query,
      ip: request.socket.remoteAddress!,
      body: request
    });

    const item: HttpServerRequestContext<NodeHttpServerContext> = {
      request: httpRequest,
      respond: getResponder(response),
      context,
      async close() {
        return new Promise<void>((resolve) => response.end(resolve));
      }
    };

    return item;
  }
}

// eslint-disable-next-line max-lines-per-function
function getResponder(httpResponse: Http.ServerResponse): (response: HttpServerResponse) => Promise<void> {
  // eslint-disable-next-line max-statements
  async function respond(response: HttpServerResponse): Promise<void> {
    writeHeaders(response, httpResponse);
    return writeResponseBody(response, httpResponse);
  }

  return respond;
}

function writeHeaders(response: HttpServerResponse, httpResponse: ServerResponse): void {
  if (isDefined(response.body?.json)) {
    httpResponse.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  else if (isDefined(response.body?.text)) {
    httpResponse.setHeader('Content-Type', 'text/plain; charset=utf-8');
  }
  else if (isDefined(response.body?.buffer)) {
    httpResponse.setHeader('Content-Type', 'application/octet-stream');
  }
  else if (isDefined(response.body?.stream)) {
    httpResponse.setHeader('Content-Type', 'application/octet-stream');
  }
  else if (isDefined(response.body?.events)) {
    httpResponse.setHeader('Content-Type', 'text/event-stream');
  }

  for (const [name, value] of response.headers.normalizedEntries()) {
    httpResponse.setHeader(name, value);
  }

  if (isDefined(response.statusCode)) {
    httpResponse.statusCode = response.statusCode;
  }

  if (isDefined(response.statusMessage)) {
    httpResponse.statusMessage = response.statusMessage;
  }
}

async function writeResponseBody(response: HttpServerResponse, httpResponse: ServerResponse): Promise<void> {
  const simpleData =
    isDefined(response.body?.json) ? JSON.stringify(response.body!.json)
      : isDefined(response.body?.text) ? response.body!.text
        : isDefined(response.body?.buffer) ? response.body!.buffer
          : undefined;

  const streamData = isDefined(simpleData) ? undefined
    : isDefined(response.body?.stream) ? response.body!.stream
      : isDefined(response.body?.events) ? response.body!.events.readable
        : undefined;

  if (isDefined(simpleData)) {
    const bytes = isString(simpleData) ? encodeUtf8(simpleData) : simpleData;

    if (!httpResponse.hasHeader('Content-Length')) {
      httpResponse.setHeader('Content-Length', bytes.byteLength);
    }

    await write(httpResponse, bytes);
  }
  else if (isDefined(streamData)) {
    for await (const chunk of getReadableStreamIterable<Uint8Array | string>(streamData)) {
      await write(httpResponse, chunk);
    }
  }

  return new Promise<void>((resolve) => {
    httpResponse.end(resolve);
  });
}

async function write(httpResponse: Http.ServerResponse, bytes: string | Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    httpResponse.write(bytes, (error) => {
      if (isNullOrUndefined(error)) {
        resolve();
      }
      else {
        reject(error);
      }
    });
  });
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

function destroySockets(sockets: Iterable<Socket>): void {
  for (const socket of sockets) {
    socket.destroy();
  }
}
