import type { AsyncDisposable } from '#/disposable/index.js';
import { disposeAsync } from '#/disposable/index.js';
import type { HttpServerRequest, HttpServerResponse } from '#/http/server/index.js';

export type HttpServerRequestContext<Context = unknown> = {
  request: HttpServerRequest,
  context: Context,
  respond(response: HttpServerResponse): Promise<void>,
  close(): Promise<void>
};

export abstract class HttpServer<Context = unknown> implements AsyncIterable<HttpServerRequestContext<Context>>, AsyncDisposable {
  abstract readonly connectedSocketsCount: number;

  abstract listen(port: number): Promise<void>;
  abstract close(timeout: number): Promise<void>;

  abstract [Symbol.asyncIterator](): AsyncIterator<HttpServerRequestContext<Context>>;
  abstract [disposeAsync](): Promise<void>;
}
