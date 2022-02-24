import type { HttpServerRequest, HttpServerResponse } from '#/http/server';

export type HttpServerRequestContext<Context = unknown> = {
  request: HttpServerRequest,
  context: Context,
  respond(response: HttpServerResponse): Promise<void>
};

export abstract class HttpServer<Context = unknown> implements AsyncIterable<HttpServerRequestContext<Context>> {
  abstract readonly connectedSocketsCount: number;

  abstract listen(port: number): Promise<void>;
  abstract close(timeout: number): Promise<void>;

  abstract [Symbol.asyncIterator](): AsyncIterator<HttpServerRequestContext<Context>>;
}
