import type { ServerResponse } from 'node:http';
import * as Http from 'node:http';
import type { Socket } from 'node:net';
import { Writable } from 'node:stream';
import { bindNodeCallback, share } from 'rxjs';
import { match, P } from 'ts-pattern';

import { CancellationToken } from '#/cancellation/index.js';
import { disposeAsync, type AsyncDisposable } from '#/disposable/index.js';
import { HttpHeaders } from '#/http/http-headers.js';
import { HttpQuery } from '#/http/http-query.js';
import type { HttpMethod } from '#/http/types.js';
import { afterResolve, inject, Singleton } from '#/injector/index.js';
import { Logger } from '#/logger/index.js';
import { toArray } from '#/utils/array/array.js';
import { encodeUtf8 } from '#/utils/encoding.js';
import { FeedableAsyncIterable } from '#/utils/feedable-async-iterable.js';
import { Timer } from '#/utils/timer.js';
import { cancelableTimeout } from '#/utils/timing.js';
import { isDefined, isNullOrUndefined, isString } from '#/utils/type-guards.js';
import { HttpServerRequest } from '../http-server-request.js';
import type { HttpServerResponse } from '../http-server-response.js';
import { HttpServer, type HttpServerRequestContext } from '../http-server.js';
import { NodeHttpServerConfiguration } from './module.js';

type RequestItem = { request: Http.IncomingMessage, response: Http.ServerResponse };

export type NodeHttpServerContext = { nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse };

@Singleton()
export class NodeHttpServer extends HttpServer<NodeHttpServerContext> implements AsyncDisposable {
  readonly #configuration = inject(NodeHttpServerConfiguration);
  readonly #httpServer = new Http.Server();
  readonly #sockets = new Set<Socket>();
  readonly #requestIterable = new FeedableAsyncIterable<RequestItem>();
  readonly #logger = inject(Logger, NodeHttpServer.name);

  private untrackConnectedSockets?: () => void;

  get connectedSocketsCount(): number {
    return this.#sockets.size;
  }

  [afterResolve]() {
    this.#httpServer.on('request', (request: Http.IncomingMessage, response: Http.ServerResponse) => this.#requestIterable.feed({ request, response }));
  }

  async [disposeAsync](): Promise<void> {
    if (this.#httpServer.listening) {
      await this.close(3000);
      this.#requestIterable.end();
    }
  }

  async listen(port: number): Promise<void> {
    if (this.#httpServer.listening) {
      throw new Error('http server is already listening');
    }

    this.#httpServer.listen(port);

    await new Promise<void>((resolve, reject) => {
      let listeningListener: () => void;
      let errorListener: (error: Error) => void;

      listeningListener = () => {
        this.#logger.info(`Listening on port ${port}`);
        this.untrackConnectedSockets = trackConnectedSockets(this.#httpServer, this.#sockets);
        this.#httpServer.removeListener('error', errorListener);
        resolve();
      };

      errorListener = (error: Error) => {
        this.#httpServer.removeListener('listening', listeningListener);
        reject(error);
      };

      this.#httpServer.once('listening', listeningListener);
      this.#httpServer.once('error', errorListener);
    });
  }

  async close(timeout: number): Promise<void> {
    this.#logger.info('Closing http server');

    const timer = new Timer(true);

    const close$ = bindNodeCallback(this.#httpServer.close.bind(this.#httpServer))().pipe(share());
    close$.subscribe();

    while (true) {
      const connections = await getConnectionsCount(this.#httpServer);

      if (connections == 0) {
        break;
      }

      if (timer.milliseconds >= timeout) {
        this.#logger.info(`Force closing of ${connections} remaining sockets after waiting for ${timeout} milliseconds`);
        destroySockets(this.#sockets);
        break;
      }

      if (connections > 0) {
        this.#logger.info(`Waiting for ${connections} connections to end`);
        await cancelableTimeout(250, CancellationToken.from(close$));
      }
    }

    this.untrackConnectedSockets?.();
    this.untrackConnectedSockets = undefined;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<HttpServerRequestContext<NodeHttpServerContext>> {
    for await (const { request, response } of this.#requestIterable) {
      yield this.handleRequest(request, response);
    }
  }

  private handleRequest(request: Http.IncomingMessage, response: Http.ServerResponse): HttpServerRequestContext<NodeHttpServerContext> {
    const method = request.method as HttpMethod;
    const url = new URL(request.url!, `http://${request.headers.host}`);

    const headers = new HttpHeaders(request.headers);
    const query = HttpQuery.fromURLSearchParams(url.searchParams);

    const context: NodeHttpServerContext = { nodeRequest: request, nodeResponse: response };

    const clientIp = getClientIp(request.socket, headers, this.#configuration);

    this.#logger.verbose(`${request.method} from "${clientIp}" to "${request.url}"`);

    const httpRequest = new HttpServerRequest({
      url,
      method,
      headers,
      query,
      ip: clientIp,
      body: request,
    });

    const item: HttpServerRequestContext<NodeHttpServerContext> = {
      request: httpRequest,
      respond: getResponder(response),
      context,
      async close() {
        await new Promise<void>((resolve) => response.end(resolve));
      },
    };

    return item;
  }
}

function getResponder(httpResponse: Http.ServerResponse): (response: HttpServerResponse) => Promise<void> {
  async function respond(response: HttpServerResponse): Promise<void> {
    writeHeaders(response, httpResponse);
    await writeResponseBody(response, httpResponse);
  }

  return respond;
}

function writeHeaders(response: HttpServerResponse, httpResponse: ServerResponse): void {
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
  const simpleData = match(response.body)
    .with({ json: P.select(P.when(isDefined)) }, (json) => JSON.stringify(json))
    .with({ text: P.select(P.nonNullable) }, (text) => text)
    .with({ buffer: P.select(P.nonNullable) }, (buffer) => buffer)
    .otherwise(() => undefined);

  const streamData = match(response.body)
    .when(() => isDefined(simpleData), () => undefined)
    .with({ stream: P.select(P.nonNullable) }, (stream) => stream)
    .with({ events: P.select(P.nonNullable) }, (events) => events.readable)
    .otherwise(() => undefined);

  if (isDefined(simpleData)) {
    const bytes = isString(simpleData) ? encodeUtf8(simpleData) : simpleData;

    if (!httpResponse.hasHeader('Content-Length')) {
      httpResponse.setHeader('Content-Length', bytes.byteLength);
    }

    await write(httpResponse, bytes);
  }
  else if (isDefined(streamData)) {
    const responseStream = Writable.toWeb(httpResponse);
    await streamData.pipeTo(responseStream);
  }

  await new Promise<void>((resolve) => httpResponse.end(resolve));
}

async function write(httpResponse: Http.ServerResponse, bytes: string | Uint8Array): Promise<void> {
  await new Promise<void>((resolve, reject) => {
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
  return await new Promise<number>((resolve, reject) => {
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

function getClientIp(socket: Socket, headers: HttpHeaders, configuration: NodeHttpServerConfiguration): string {
  if (configuration.trustedProxiesCount <= 0) {
    return socket.remoteAddress!;
  }

  const xForwardedForHeader = headers.tryGet('X-Forwarded-For');

  if (isNullOrUndefined(xForwardedForHeader)) {
    return socket.remoteAddress!;
  }

  const ips = toArray(xForwardedForHeader).flatMap((value) => (value as string).split(',').map((ip) => ip.trim()).filter((ip) => ip.length > 0));

  return ips.at(-configuration.trustedProxiesCount) ?? socket.remoteAddress!;
}
