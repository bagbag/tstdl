import type { JsonPrimitive, StringMap, TypedOmit, UndefinableJson, UndefinableJsonInnerNode, UndefinableJsonObject, UndefinableJsonPrimitive } from '#/types';
import type { CancellationToken, ReadonlyCancellationToken } from '#/utils/cancellation-token';
import { filterObject } from '#/utils/object';
import { isArray, isDefined, isNull, isObject, isUndefined } from '#/utils/type-guards';

export const abortToken: unique symbol = Symbol('abortToken');

export type HttpClientRequestContext<T extends Record<any, unknown> = Record<any, unknown>> = T;

export type HttpValue = UndefinableJsonPrimitive;
export type HttpValueMap = StringMap<HttpValue | HttpValue[]>;
export type HttpValueEntry = [string, HttpValue | HttpValue[]];

export type NormalizedHttpValue = string;
export type NormalizedHttpValueMap = StringMap<NormalizedHttpValue | NormalizedHttpValue[]>;
export type NormalizedHttpValueEntry = [string, NormalizedHttpValue | NormalizedHttpValue[]];

export type HttpHeaders = HttpValueMap;
export type HttpParameters = UndefinableJsonObject;
export type HttpUrlParameters = HttpValueMap;
export type HttpQuery = HttpValueMap;
export type HttpForm = HttpValueMap;

export type NormalizedHttpHeaders = NormalizedHttpValueMap;
export type NormalizedHttpUrlParameters = NormalizedHttpValueMap;
export type NormalizedHttpQuery = NormalizedHttpValueMap;
export type NormalizedHttpForm = NormalizedHttpValueMap;

export type HttpGetMethod = 'get';
export type HttpPostMethod = 'post';
export type HttpPutMethod = 'put';
export type HttpPatchMethod = 'patch';
export type HttpHeadMethod = 'head';
export type HttpDeleteMethod = 'delete';

export type HttpMethod =
  | HttpGetMethod
  | HttpPostMethod
  | HttpPutMethod
  | HttpPatchMethod
  | HttpHeadMethod
  | HttpDeleteMethod;

export type HttpNoneBodyType = 'none';
export type HttpAutoBodyType = 'auto';
export type HttpTextBodyType = 'text';
export type HttpJsonBodyType = 'json';
export type HttpStreamBodyType = 'stream';
export type HttpBufferBodyType = 'buffer';

export type HttpBodyType =
  | HttpNoneBodyType
  | HttpAutoBodyType
  | HttpTextBodyType
  | HttpJsonBodyType
  | HttpStreamBodyType
  | HttpBufferBodyType;

export type HttpBody<B extends HttpBodyType = HttpBodyType>
  = B extends HttpNoneBodyType ? undefined
  : B extends HttpAutoBodyType ? UndefinableJson | string | Uint8Array | undefined
  : B extends HttpTextBodyType ? string
  : B extends HttpJsonBodyType ? UndefinableJson
  : B extends HttpStreamBodyType ? AsyncIterable<Uint8Array>
  : B extends HttpBufferBodyType ? Uint8Array
  : undefined;

export type NormalizedHttpClientRequest = {
  url: string,
  method: HttpMethod,
  responseType: HttpBodyType,
  [abortToken]: CancellationToken,
  headers?: NormalizedHttpHeaders,
  body?: {
    form?: NormalizedHttpForm,
    json?: UndefinableJson,
    text?: string,
    buffer?: Uint8Array,
    stream?: AsyncIterable<Uint8Array>
  },
  timeout?: number,
  context: HttpClientRequestContext
};

export type HttpClientRequest = {
  url: string,
  method: HttpMethod,
  responseType: HttpBodyType,
  headers?: HttpHeaders,

  /**
   * automatically maps parameters to `urlParameters`, `query` and `body`
   * depending on whether the `url` has parameters specified, the request `method`
   * and if there is already an `body`
   * @see mapParametersToUrl
   * @see mapParametersToQuery
   * @see mapParametersToBody
   */
  parameters?: HttpParameters,
  mapParametersToUrl?: boolean,
  mapParametersToQuery?: boolean,
  mapParametersToBody?: boolean,

  /**
   * parameters for url
   * @example
   * {
   *   url: 'http://domain.tld/users/:userId',
   *   urlParameters: { userId: 123 }
   * }
   * // -> http://domain.tld/users/123
   */
  urlParameters?: HttpUrlParameters,

  /**
   * separator for url parameter array
   * @default ','
   * @example
   * {
   *   url: 'http://domain.tld/users/:userId',
   *   urlParameters: { userId: [123, 456] },
   *   urlParametersSeparator: ';'
   * }
   * // -> http://domain.tld/users/123;456
   */
  urlParametersSeparator?: string,

  /**
   * url query
   * @example
   * {
   *   url: 'http://domain.tld/search',
   *   query: { categories: [3, 8], limit: 10 }
   * }
   * // -> http://domain.tld/search?categories=3&categories=8&limit=10
   */
  query?: HttpQuery,

  /**
   * request body
   */
  body?: {
    form?: HttpForm,
    json?: UndefinableJson,
    text?: string,
    buffer?: Uint8Array,
    stream?: AsyncIterable<Uint8Array>
  },

  /**
   * request timeout in milliseconds
   */
  timeout?: number,

  /**
   * can be used to cancel the request. Throws HttpError
   */
  [abortToken]: CancellationToken,

  /**
   * can be used to store data for middleware etc.
   *
   * will not be used for actual request
   */
  context: HttpClientRequestContext
};

export type HttpClientRequestOptions = TypedOmit<HttpClientRequest, 'url' | 'method' | 'responseType' | 'context' | typeof abortToken> & {
  abortToken?: ReadonlyCancellationToken,
  context?: HttpClientRequestContext
};

export type HttpClientResponse<T extends HttpBodyType = HttpBodyType> = {
  request: NormalizedHttpClientRequest,
  statusCode: number,
  statusMessage?: string,
  header: NormalizedHttpHeaders,
  body: HttpBody<T>
};

export type HttpServerRequest<B extends HttpBodyType = HttpBodyType> = {
  url: URL,
  method: HttpMethod,
  headers: NormalizedHttpHeaders,
  query: NormalizedHttpQuery,
  ip: string,
  body: HttpBody<B>
};

export type HttpServerResponse<JsonType extends UndefinableJson = UndefinableJson> = {
  statusCode?: number,
  statusMessage?: string,
  headers?: HttpHeaders,
  body?: {
    json?: JsonType,
    text?: string,
    buffer?: ArrayBuffer,
    stream?: AsyncIterable<ArrayBuffer>
  }
};

export type HttpRequestData<B extends HttpBodyType = 'auto'> = {
  urlParameters: NormalizedHttpUrlParameters,
  query: NormalizedHttpQuery,
  body: HttpBody<B>
};

export function normalizedHttpClientRequest(request: HttpClientRequest): NormalizedHttpClientRequest {
  const normalizedRequest: NormalizedHttpClientRequest = {
    url: request.url,
    method: request.method,
    responseType: request.responseType,
    [abortToken]: request[abortToken],
    context: request.context
  };

  if (isDefined(request.headers)) {
    const normalizedHeaders = normalizeHttpParameters(request.headers);

    if (isDefined(normalizedHeaders)) {
      normalizedRequest.headers = normalizedHeaders;
    }
  }

  if (isDefined(request.body)) {
    normalizedRequest.body = filterObject({
      form: normalizeHttpParameters(request.body.form),
      json: request.body.json,
      text: request.body.text,
      buffer: request.body.buffer,
      stream: request.body.stream
    }, isDefined);
  }

  if (isDefined(request.timeout)) {
    normalizedRequest.timeout = request.timeout;
  }

  return normalizedRequest;
}

export function normalizeHttpParameters(parameters: HttpParameters | undefined): NormalizedHttpValueMap | undefined {
  if (isUndefined(parameters)) {
    return undefined;
  }

  const entries = Object.entries(parameters);

  const normalizedEntries = entries
    .map(([key, value]) => {
      const normalizedValue = normalizeHttpValue(value);
      return isDefined(normalizedValue) ? ([key, normalizedValue] as const) : undefined;
    })
    .filter(isDefined);

  if (normalizedEntries.length == 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries) as NormalizedHttpValueMap;
}

export function normalizeHttpValue(value: UndefinableJsonInnerNode): NormalizedHttpValue | NormalizedHttpValue[] | undefined {
  if (isUndefined(value)) {
    return undefined;
  }

  if (isArray(value)) {
    const normalizedArray = value.map(normalizeHttpValue).filter(isDefined) as NormalizedHttpValue[];
    return (normalizedArray.length > 0) ? normalizedArray : undefined;
  }

  return normalizeSingleHttpValue(value);
}

export function normalizeSingleHttpValue(value: JsonPrimitive | UndefinableJsonObject): NormalizedHttpValue | undefined {
  if (isObject(value)) {
    return JSON.stringify(value);
  }

  if (isNull(value)) {
    return '[[null]]';
  }

  return value.toString();
}
