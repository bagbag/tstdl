import { Injector } from '#/injector/injector.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { HttpClientOptions } from './http-client-options.js';
import { HttpClientAdapter } from './http-client.adapter.js';
import type { HttpClientMiddleware } from './middleware.js';
import { HTTP_CLIENT_MIDDLEWARE } from './tokens.js';

export type HttpClientModuleConfig = HttpClientOptions & {
  adapter?: Type<HttpClientAdapter>,

  /**
   * middlewares to add
   */
  middleware?: HttpClientMiddleware[]
};

let options: HttpClientOptions = {};

export function configureHttpClient({ adapter, middleware, ...rest }: HttpClientModuleConfig): void {
  if (isDefined(adapter)) {
    Injector.register(HttpClientAdapter, { useToken: adapter });
  }

  options = {
    ...options,
    baseUrl: rest.baseUrl ?? options.baseUrl,
    enableErrorHandling: rest.enableErrorHandling ?? options.enableErrorHandling
  };

  if (isDefined(middleware)) {
    for (const m of middleware) {
      Injector.register(HTTP_CLIENT_MIDDLEWARE, { useToken: m }, { multi: true });
    }
  }

  Injector.register(HttpClientOptions, { useValue: options });
}
