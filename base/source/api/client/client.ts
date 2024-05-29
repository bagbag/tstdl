import { HttpClient, HttpClientRequest, type HttpClientArgument, type HttpClientOptions, type HttpClientResponse, type HttpRequestBody } from '#/http/client/index.js';
import { normalizeSingleHttpValue } from '#/http/types.js';
import { inject } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import { resolveArgumentType, type Resolvable } from '#/injector/interfaces.js';
import { Schema } from '#/schema/index.js';
import { ServerSentEvents } from '#/sse/server-sent-events.js';
import type { Type, UndefinableJsonObject } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { copyObjectProperties, objectEntries } from '#/utils/object/object.js';
import { toTitleCase } from '#/utils/string/title-case.js';
import { isArray, isBlob, isDefined, isObject, isReadableStream, isString, isUint8Array, isUndefined } from '#/utils/type-guards.js';
import { buildUrl } from '#/utils/url-builder.js';
import { resolveValueOrProvider } from '#/utils/value-or-provider.js';
import { normalizedApiDefinitionEndpointsEntries, type ApiClientImplementation, type ApiDefinition, type ApiEndpointDefinition, type ApiEndpointDefinitionResult, type ApiEndpointKeys, type ApiParameters } from '../types.js';
import { getFullApiEndpointResource } from '../utils.js';

export type ApiClient<T extends ApiDefinition> = Type<ApiClientImplementation<T> & Resolvable<HttpClient | HttpClientOptions>, [httpClientOrOptions?: HttpClient | HttpClientOptions]>;

export type ClientOptions = {
  /**
   * Url prefix
   * @default `api/`
   */
  prefix?: string | null,

  defaultHttpClientOptions?: HttpClientOptions | null
};

export type ApiClientHttpRequestContext = {
  endpoint: ApiEndpointDefinition
};

export const httpClientSymbol = Symbol('ApiTransport');
export const apiDefinitionSymbol = Symbol('ApiDefinition');

export const defaultOptions: ClientOptions = {};

export function setDefaultApiClientOptions(options: ClientOptions): void {
  copyObjectProperties(options, defaultOptions);
}

// eslint-disable-next-line max-lines-per-function
export function compileClient<T extends ApiDefinition>(definition: T, options: ClientOptions = defaultOptions): ApiClient<T> {
  const { resource: path, endpoints } = definition;
  const constructedApiName = toTitleCase(path[0] ?? '');
  const apiName = `${constructedApiName}ApiClient`;

  const api = {
    [apiName]: class implements Resolvable<HttpClient | HttpClientArgument> {
      protected readonly [httpClientSymbol]: HttpClient;
      readonly [apiDefinitionSymbol]: T;

      declare readonly [resolveArgumentType]: HttpClient | HttpClientArgument;
      constructor(httpClientOrOptions?: HttpClient | HttpClientOptions) {
        this[httpClientSymbol] = (httpClientOrOptions instanceof HttpClient) ? httpClientOrOptions : inject(HttpClient, httpClientOrOptions);
        this[apiDefinitionSymbol] = definition;
      }

      getEndpointResource<E extends ApiEndpointKeys<T>>(endpoint: E, parameters?: ApiParameters<T, E>): string {
        const resource = getFullApiEndpointResource({ api: definition, endpoint: resolveValueOrProvider(definition.endpoints[endpoint as any]!), defaultPrefix: options.prefix });

        if (isUndefined(parameters)) {
          return resource;
        }

        return buildUrl(resource, parameters).parsedUrl;
      }

      getEndpointUrl<E extends ApiEndpointKeys<T>>(endpoint: E, parameters?: ApiParameters<T, E>): URL {
        const url = this.getEndpointResource(endpoint, parameters);
        return new URL(url, this[httpClientSymbol].options.baseUrl);
      }
    }
  }[apiName]!;

  Injector.registerSingleton(api, {
    useFactory: (argument, context) => {
      const httpClient = (argument instanceof HttpClient) ? argument : context.resolve(HttpClient, argument ?? options.defaultHttpClientOptions ?? undefined);
      return new api(httpClient);
    }
  });

  const endpointsEntries = normalizedApiDefinitionEndpointsEntries(endpoints);

  for (const [name, endpoint] of endpointsEntries) {
    const methods = isArray(endpoint.method) ? endpoint.method : [endpoint.method ?? 'GET'];
    let resource: string | undefined;

    const hasGet = methods.includes('GET');
    const fallbackMethod = methods.find((method) => method != 'GET') ?? 'GET';

    const apiEndpointFunction = {
      async [name](this: InstanceType<typeof api>, parameters?: UndefinableJsonObject, requestBody?: any): Promise<unknown> {
        resource ??= getFullApiEndpointResource({ api: definition, endpoint, defaultPrefix: options.prefix });

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

export function getHttpClientOfApiClient(apiClient: any): HttpClient {
  return (apiClient as Record<typeof httpClientSymbol, HttpClient>)[httpClientSymbol];
}

export function getApiDefinitionOfApiClient(apiClient: any): ApiDefinition {
  return (apiClient as Record<typeof apiDefinitionSymbol, ApiDefinition>)[apiDefinitionSymbol];
}
