import { Injector } from '#/injector/injector.js';
import type { OneOrMany, Type } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
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
  middleware?: OneOrMany<HttpClientMiddleware>
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
    for (const m of toArray(middleware)) {
      Injector.register(HTTP_CLIENT_MIDDLEWARE, { useValue: m }, { multi: true });
    }
  }

  Injector.register(HttpClientOptions, { useValue: options });
}
