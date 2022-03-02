import { HttpError, HttpErrorReason } from '#/http';
import type { HttpClient, HttpClientResponse } from '#/http/client';
import { HttpClientRequest } from '#/http/client';
import type { HttpBodyType } from '#/http/types';
import { AsyncIterableSchemaValidator, StringSchemaValidator, Uint8ArraySchemaValidator } from '#/schema';
import type { UndefinableJsonObject } from '#/types';
import { toArray } from '#/utils/array';
import { compareByValueDescending } from '#/utils/comparison';
import { isNull, isUndefined } from '#/utils/type-guards';
import type { ApiClientImplementation, ApiDefinition, ApiEndpointDefinitionResult } from './types';
import { rootResource } from './types';

export type ApiClient<T extends ApiDefinition> = new (httpClient: HttpClient) => ApiClientImplementation<T>;

export type ClientOptions = {
  /**
   * url prefix (default: 'api/')
   */
  prefix?: string
};

export const httpClientSymbol = Symbol('ApiTransport');
export const apiDefinitionSymbol = Symbol('ApiDefinition');

// eslint-disable-next-line max-lines-per-function
export function compileClient<T extends ApiDefinition>(definition: T, options: ClientOptions = {}): ApiClient<T> {
  const { resource: path, endpoints } = definition;
  const constructedApiName = (path[0]?.toUpperCase() ?? '') + path.slice(1);
  const apiName = `${constructedApiName}ApiClient`;

  const api = {
    [apiName]: class {
      protected readonly [httpClientSymbol]: HttpClient;
      readonly [apiDefinitionSymbol]: T;

      constructor(httpClient: HttpClient) {
        this[httpClientSymbol] = httpClient;
        this[apiDefinitionSymbol] = definition;
      }
    }
  }[apiName]!;

  const endpointsEntries = Object.entries(endpoints);

  const base = path;
  const prefix = options.prefix ?? 'api/';

  for (const [name, config] of endpointsEntries) {
    const version = (isUndefined(config.version) ? [1] : toArray(config.version as number)).sort(compareByValueDescending)[0]!;
    const method = config.method ?? 'get';
    const versionPrefix = isNull(config.version) ? '' : `v${version}/`;
    const resource = (config.resource == rootResource) ? `${prefix}${versionPrefix}${base}` : `${prefix}${versionPrefix}${base}/${config.resource ?? name}`;

    const apiEndpointFunction = {
      async [name](this: InstanceType<typeof api>, parameters?: UndefinableJsonObject): Promise<unknown> {
        const responseType: HttpBodyType
          = (config.result instanceof AsyncIterableSchemaValidator) ? 'stream'
            : (config.result instanceof StringSchemaValidator) ? 'text'
              : (config.result instanceof Uint8ArraySchemaValidator) ? 'buffer'
                : (config.result == undefined) ? 'none'
                  : 'json';

        const request = new HttpClientRequest({
          method,
          url: resource,
          responseType,
          parameters
        });

        let response: HttpClientResponse | undefined;

        try {
          response = await this[httpClientSymbol].rawRequest(request);

          const result = await getBody(response, config.result);
          return result;
        }
        catch (error) {
          return new HttpError(HttpErrorReason.Unknown, request, response, error as Error);
        }
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
