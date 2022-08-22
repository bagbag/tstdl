import type { Injectable } from '#/container';
import { container, resolveArgumentType } from '#/container';
import type { HttpClientOptions, HttpClientResponse } from '#/http/client';
import { HttpClient, HttpClientRequest } from '#/http/client';
import { Schema } from '#/schema';
import type { UndefinableJsonObject } from '#/types';
import { isArray, isUndefined } from '#/utils/type-guards';
import type { ApiClientImplementation, ApiDefinition, ApiEndpointDefinition, ApiEndpointDefinitionResult } from '../types';
import { normalizedApiDefinitionEndpointsEntries } from '../types';
import { getFullApiEndpointResource } from '../utils';

export type ApiClient<T extends ApiDefinition> = new (httpClient: HttpClient) => ApiClientImplementation<T> & Injectable<HttpClientOptions>;

export type ClientOptions = {
  /**
   * url prefix
   * @default `api/`
   */
  prefix?: string,

  defaultHttpClientOptions?: HttpClientOptions
};

export type ApiClientHttpRequestContext = {
  endpoint: ApiEndpointDefinition
};

export const httpClientSymbol = Symbol('ApiTransport');
export const apiDefinitionSymbol = Symbol('ApiDefinition');

// eslint-disable-next-line max-lines-per-function
export function compileClient<T extends ApiDefinition>(definition: T, options: ClientOptions = {}): ApiClient<T> {
  const { resource: path, endpoints } = definition;
  const constructedApiName = (path[0]?.toUpperCase() ?? '') + path.slice(1);
  const apiName = `${constructedApiName}ApiClient`;

  const api = {
    [apiName]: class implements Injectable<HttpClientOptions> {
      protected readonly [httpClientSymbol]: HttpClient;
      readonly [apiDefinitionSymbol]: T;

      readonly [resolveArgumentType]: HttpClientOptions;
      constructor(httpClient: HttpClient) {
        this[httpClientSymbol] = httpClient;
        this[apiDefinitionSymbol] = definition;
      }
    }
  }[apiName]!;

  container.registerSingleton(api, {
    useFactory: (argument, context) => {
      const httpClient = context.resolve(HttpClient, argument ?? options.defaultHttpClientOptions);
      return new api(httpClient);
    }
  });

  const endpointsEntries = normalizedApiDefinitionEndpointsEntries(endpoints);

  for (const [name, endpoint] of endpointsEntries) {
    const methods = isArray(endpoint.method) ? endpoint.method : [endpoint.method ?? 'GET'];
    const resource = getFullApiEndpointResource({ api: definition, endpoint, prefix: options.prefix });

    const hasGet = methods.includes('GET');
    const fallbackMethod = methods.filter((method) => method != 'GET')[0] ?? 'GET';

    const apiEndpointFunction = {
      async [name](this: InstanceType<typeof api>, parameters?: UndefinableJsonObject): Promise<unknown> {
        const context: ApiClientHttpRequestContext = { endpoint };
        const method = (hasGet && isUndefined(parameters)) ? 'GET' : fallbackMethod;

        const request = new HttpClientRequest({
          method,
          url: resource,
          parameters,
          context
        });

        const response = await this[httpClientSymbol].rawRequest(request);
        return getBody(response, endpoint.result);
      }
    }[name];

    Object.defineProperty(api.prototype, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: apiEndpointFunction
    });
  }

  return api as unknown as ApiClient<T>;
}

function getBody(response: HttpClientResponse, schema: ApiEndpointDefinitionResult | undefined): unknown {
  if (isUndefined(schema)) {
    return undefined;
  }

  return Schema.parse(schema, response.body);
}
