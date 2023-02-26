import type { Injectable } from '#/container/index.js';
import { container, resolveArgumentType } from '#/container/index.js';
import type { HttpClientArgument, HttpClientOptions, HttpClientResponse, HttpRequestBody } from '#/http/client/index.js';
import { HttpClient, HttpClientRequest } from '#/http/client/index.js';
import { normalizeSingleHttpValue } from '#/http/types.js';
import { Schema } from '#/schema/index.js';
import { ServerSentEvents } from '#/sse/server-sent-events.js';
import type { UndefinableJsonObject } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { objectEntries } from '#/utils/object/object.js';
import { toTitleCase } from '#/utils/string/title-case.js';
import { isArray, isBlob, isDefined, isObject, isReadableStream, isString, isUint8Array, isUndefined } from '#/utils/type-guards.js';
import { buildUrl } from '#/utils/url-builder.js';
import type { ApiClientImplementation, ApiDefinition, ApiEndpointDefinition, ApiEndpointDefinitionResult } from '../types.js';
import { normalizedApiDefinitionEndpointsEntries } from '../types.js';
import { getFullApiEndpointResource } from '../utils.js';

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
  const constructedApiName = toTitleCase(path[0] ?? '');
  const apiName = `${constructedApiName}ApiClient`;

  const api = {
    [apiName]: class implements Injectable<HttpClient | HttpClientOptions> {
      protected readonly [httpClientSymbol]: HttpClient;
      readonly [apiDefinitionSymbol]: T;

      readonly [resolveArgumentType]: HttpClientOptions;
      constructor(httpClientOrOptions: HttpClient | HttpClientArgument) {
        this[httpClientSymbol] = (httpClientOrOptions instanceof HttpClient) ? httpClientOrOptions : container.resolve(HttpClient, httpClientOrOptions);
        this[apiDefinitionSymbol] = definition;
      }
    }
  }[apiName]!;

  container.registerSingleton(api, {
    useFactory: (argument, context) => {
      const httpClient = (argument instanceof HttpClient) ? argument : context.resolve(HttpClient, argument ?? options.defaultHttpClientOptions);
      return new api(httpClient);
    }
  });

  const endpointsEntries = normalizedApiDefinitionEndpointsEntries(endpoints);

  for (const [name, endpoint] of endpointsEntries) {
    const methods = isArray(endpoint.method) ? endpoint.method : [endpoint.method ?? 'GET'];
    const resource = getFullApiEndpointResource({ api: definition, endpoint, defaultPrefix: options.prefix });

    const hasGet = methods.includes('GET');
    const fallbackMethod = methods.filter((method) => method != 'GET')[0] ?? 'GET';

    const apiEndpointFunction = {
      async [name](this: InstanceType<typeof api>, parameters?: UndefinableJsonObject, requestBody?: any): Promise<unknown> {
        const context: ApiClientHttpRequestContext = { endpoint };
        const method = (hasGet && isUndefined(parameters)) ? 'GET' : fallbackMethod;

        if (endpoint.result == ServerSentEvents) {
          if (isDefined(requestBody)) {
            throw new Error('Body not supported for Server Sent Events.');
          }

          return getServerSentEvents(this[httpClientSymbol].options.baseUrl, resource, endpoint, parameters);
        }

        const request = new HttpClientRequest({
          method,
          url: resource,
          parameters,
          body: getRequestBody(requestBody),
          credentials: (endpoint.credentials == true) ? 'include' : undefined,
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

  if (isBlob(body)) {
    return { blob: body };
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

function getServerSentEvents(baseUrl: string | undefined, resource: string, endpoint: ApiEndpointDefinition, parameters: UndefinableJsonObject | undefined): ServerSentEvents {
  const { parsedUrl, parametersRest } = buildUrl(resource, parameters, { arraySeparator: ',' });

  const url = new URL(parsedUrl, baseUrl);

  for (const [parameter, value] of objectEntries(parametersRest)) {
    for (const val of toArray(value)) {
      if (isUndefined(val) || isObject(val)) {
        continue;
      }

      url.searchParams.append(parameter as string, normalizeSingleHttpValue(val));
    }
  }

  return new ServerSentEvents(url.toString(), { withCredentials: endpoint.credentials });
}
