import type { Injectable } from '#/container';
import { container, resolveArgumentType } from '#/container';
import type { HttpClientOptions, HttpClientResponse, HttpRequestBody } from '#/http/client';
import { HttpClient, HttpClientRequest } from '#/http/client';
import { Schema } from '#/schema';
import type { UndefinableJsonObject } from '#/types';
import { isArray, isReadableStream, isString, isUint8Array, isUndefined } from '#/utils/type-guards';
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
      async [name](this: InstanceType<typeof api>, parameters?: UndefinableJsonObject, requestBody?: any): Promise<unknown> {
        const context: ApiClientHttpRequestContext = { endpoint };
        const method = (hasGet && isUndefined(parameters)) ? 'GET' : fallbackMethod;

        const request = new HttpClientRequest({
          method,
          url: resource,
          parameters,
          body: getRequestBody(requestBody),
          context
        });

        const response = await this[httpClientSymbol].rawRequest(request);
        return getResponseBody(response, endpoint.result);
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

function getRequestBody(body: unknown): HttpRequestBody | undefined {
  if (isUndefined(body)) {
    return undefined;
  }

  if (isUint8Array(body)) {
    return { buffer: body };
  }

  if (isReadableStream(body)) {
    return { stream: body };
  }

  if (isString(body)) {
    return { text: body };
  }

  return { json: body as any };
}

async function getResponseBody(response: HttpClientResponse, schema: ApiEndpointDefinitionResult | undefined): Promise<unknown> {
  if (isUndefined(schema)) {
    response.close();
    return undefined;
  }

  const body = response.hasBody
    ? (schema == ReadableStream)
      ? response.body.readAsBinaryStream()
      : (schema == Uint8Array)
        ? await response.body.readAsBuffer()
        : (schema == String)
          ? await response.body.readAsText()
          : await response.body.read()
    : undefined;

  return Schema.parse(schema, body, { mask: true }) as Promise<unknown>;
}
