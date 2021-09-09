import type { StringMap, TypedOmit, UndefinableJson, UndefinableJsonObject, UndefinableJsonPrimitive } from '#/types';

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
  : B extends HttpAutoBodyType ? UndefinableJson | string | ArrayBuffer | undefined
  : B extends HttpTextBodyType ? string
  : B extends HttpJsonBodyType ? UndefinableJson
  : B extends HttpStreamBodyType ? AsyncIterable<ArrayBuffer>
  : B extends HttpBufferBodyType ? ArrayBuffer
  : undefined;

export type NormalizedHttpClientRequest = {
  url: string,
  method: HttpMethod,
  responseType: HttpBodyType,
  headers?: NormalizedHttpHeaders,
  body?: {
    form?: NormalizedHttpForm,
    json?: UndefinableJson,
    text?: string,
    buffer?: ArrayBuffer,
    stream?: AsyncIterable<ArrayBuffer>
  },
  timeout?: number,
  context?: Record<any, unknown>
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
    buffer?: ArrayBuffer,
    stream?: AsyncIterable<ArrayBuffer>
  },

  /**
   * request timeout in milliseconds
   */
  timeout?: number,

  /**
   * can be used to store data for middleware etc.
   *
   * will not be used for actual request
   */
  context?: Record<any, unknown>
};

export type HttpClientRequestOptions = TypedOmit<HttpClientRequest, 'url' | 'method' | 'responseType'>;

export type HttpClientResponse<T extends HttpBodyType = HttpBodyType> = {
  request: HttpClientRequest,
  statusCode: number,
  statusMessage?: string,
  header: NormalizedHttpHeaders,
  body: HttpBody<T>
};

export type HttpServerRequest<B extends HttpBodyType = HttpBodyType> = {
  url: URL,
  method: HttpMethod,
  headers: NormalizedHttpHeaders,
  urlParameters: NormalizedHttpUrlParameters,
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
