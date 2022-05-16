import type { Injectable } from '#/container';
import { container, resolveArgumentType } from '#/container';
import type { HttpClientResponse } from '#/http/client';
import { HttpClient, HttpClientRequest } from '#/http/client';
import type { HttpBodyType } from '#/http/types';
import { AsyncIterableSchemaValidator, StringSchemaValidator, Uint8ArraySchemaValidator } from '#/schema';
import type { UndefinableJsonObject } from '#/types';
import { toArray } from '#/utils/array';
import { compareByValueDescending } from '#/utils/comparison';
import { isArray, isNull, isUndefined } from '#/utils/type-guards';
import type { ApiClientImplementation, ApiDefinition, ApiEndpointDefinition, ApiEndpointDefinitionResult } from '../types';
import { rootResource } from '../types';

export type ApiClient<T extends ApiDefinition> = new (httpClient: HttpClient) => ApiClientImplementation<T>;

export type ClientOptions = {
  /**
   * url prefix (default: 'api/')
   */
  prefix?: string
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
    [apiName]: class implements Injectable<HttpClient> {
      protected readonly [httpClientSymbol]: HttpClient;
      readonly [apiDefinitionSymbol]: T;

      readonly [resolveArgumentType]: HttpClient;
      constructor(httpClient: HttpClient) {
        this[httpClientSymbol] = httpClient;
        this[apiDefinitionSymbol] = definition;
      }
    }
  }[apiName]!;

  container.registerSingleton(api, {
    useFactory: (argument, context) => {
      const httpClient = argument ?? context.resolve(HttpClient);
      return new api(httpClient);
    }
  });

  const endpointsEntries = Object.entries(endpoints);

  const base = path;
  const prefix = options.prefix ?? 'api/';

  for (const [name, config] of endpointsEntries) {
    const version = (isUndefined(config.version) ? [1] : toArray(config.version as number)).sort(compareByValueDescending)[0]!;
    const methods = isArray(config.method) ? config.method : [config.method ?? 'GET'];
    const versionPrefix = isNull(config.version) ? '' : `v${version}/`;
    const resource = (config.resource == rootResource) ? `${prefix}${versionPrefix}${base}` : `${prefix}${versionPrefix}${base}/${config.resource ?? name}`;

    const hasGet = methods.includes('GET');
    const fallbackMethod = methods.filter((method) => method != 'GET')[0] ?? 'GET';

    const apiEndpointFunction = {
      async [name](this: InstanceType<typeof api>, parameters?: UndefinableJsonObject): Promise<unknown> {
        const responseType: HttpBodyType
          = (config.result instanceof AsyncIterableSchemaValidator) ? 'stream'
            : (config.result instanceof StringSchemaValidator) ? 'text'
              : (config.result instanceof Uint8ArraySchemaValidator) ? 'buffer'
                : (config.result == undefined) ? 'none'
                  : 'json';

        const context: ApiClientHttpRequestContext = {
          endpoint: config
        };

        const method = (hasGet && isUndefined(parameters)) ? 'GET' : fallbackMethod;

        const request = new HttpClientRequest({
          method,
          url: resource,
          responseType,
          parameters,
          context
        });

        const response = await this[httpClientSymbol].rawRequest(request);
        return getBody(response, config.result);
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

async function getBody(response: HttpClientResponse, schema: ApiEndpointDefinitionResult | undefined): Promise<unknown> {
  if (isUndefined(schema)) {
    return undefined;
  }

  return schema.parseAsync(response.body);
}
