import { container } from '#/container/index.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { HttpClientOptions } from './http-client-options.js';
import { HttpClientAdapter } from './http-client.adapter.js';

export type HttpClientModuleConfig = HttpClientOptions & {
  adapter?: Type<HttpClientAdapter>
};

let options: HttpClientOptions = {};

export function configureHttpClient({ adapter, ...rest }: HttpClientModuleConfig): void {
  if (isDefined(adapter)) {
    container.register(HttpClientAdapter, { useToken: adapter });
  }

  options = {
    ...options,
    baseUrl: rest.baseUrl ?? options.baseUrl,
    middleware: [...(options.middleware ?? []), ...(rest.middleware ?? [])],
    enableErrorHandling: rest.enableErrorHandling ?? options.enableErrorHandling
  };

  container.register(HttpClientOptions, { useValue: options });
}
