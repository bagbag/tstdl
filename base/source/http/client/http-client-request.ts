import type { Disposable } from '#/disposable/index.js';
import { dispose } from '#/disposable/index.js';
import type { Record, TypedOmit, UndefinableJson, UndefinableJsonObject } from '#/types.js';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token.js';
import { CancellationToken } from '#/utils/cancellation-token.js';
import { clone } from '#/utils/clone.js';
import { isDefined, isString, isUndefined } from '#/utils/type-guards.js';
import type { HttpFormObject } from '../http-form.js';
import { HttpForm } from '../http-form.js';
import type { HttpHeadersObject } from '../http-headers.js';
import { HttpHeaders } from '../http-headers.js';
import type { HttpQueryObject } from '../http-query.js';
import { HttpQuery } from '../http-query.js';
import type { HttpUrlParametersObject } from '../http-url-parameters.js';
import { HttpUrlParameters } from '../http-url-parameters.js';
import type { HttpMethod } from '../types.js';

/** only one type at a time is supported. If multiple are set, behaviour is undefined */
export type HttpRequestBody = {
  text?: string,
  json?: UndefinableJson,
  form?: HttpForm,
  buffer?: Uint8Array,
  blob?: Blob,
  stream?: ReadableStream<Uint8Array>
};

export type HttpRequestAuthorization = {
  basic?: {
    username: string,
    password: string
  },
  bearer?: string,
  token?: string
};

export type HttpClientRequestOptions = Partial<TypedOmit<HttpClientRequest, 'url' | 'method' | 'abortToken' | 'abort' | 'headers' | 'query' | 'body'>> & {
  urlParameter?: HttpUrlParametersObject | HttpUrlParameters,
  headers?: HttpHeadersObject | HttpHeaders,
  query?: HttpQueryObject | HttpQuery,
  credentials?: HttpRequestCredentials,
  authorization?: HttpRequestAuthorization,
  body?: {
    text?: string,
    json?: UndefinableJson,
    form?: HttpFormObject | HttpForm,
    buffer?: Uint8Array,
    stream?: ReadableStream<Uint8Array>
  },
  abortToken?: ReadonlyCancellationToken
};

export type HttpRequestCredentials = 'omit' | 'same-origin' | 'include';

export type HttpClientRequestObject = HttpClientRequestOptions & {
  url: string,
  method?: HttpMethod
};

export class HttpClientRequest implements Disposable {
  private readonly _abortToken: CancellationToken;

  url: string;
  method: HttpMethod;
  headers: HttpHeaders;

  /**
   * automatically maps parameters to `urlParameters`, `query` and `body`
   * depending on whether the `url` has parameters specified, the request `method`
   * and if there is already a `body` or not
   * @see mapParametersToUrl
   * @see mapParametersToQuery
   * @see mapParametersToBody
   */
  parameters: UndefinableJsonObject | undefined;
  mapParametersToUrl: boolean;
  mapParametersToQuery: boolean;
  mapParametersToBody: boolean;

  /**
   * parameters for url
   * @example
   * {
   *   url: 'http://domain.tld/users/:userId',
   *   urlParameters: { userId: 123 }
   * }
   * // -> http://domain.tld/users/123
   */
  urlParameters: HttpUrlParameters;

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
  urlParametersSeparator: string;

  /**
   * url query
   * @example
   * {
   *   url: 'http://domain.tld/search',
   *   query: { categories: [3, 8], limit: 10 }
   * }
   * // -> http://domain.tld/search?categories=3&categories=8&limit=10
   */
  query: HttpQuery;
  credentials: HttpRequestCredentials | undefined;
  authorization: HttpRequestAuthorization | undefined;
  body: HttpRequestBody | undefined;

  /**
   * request timeout in milliseconds
   * @default 30000
   */
  timeout: number;
  throwOnNon200: boolean;

  /**
   * can be used to store data for middleware etc.
   *
   * will not be used for actual request
   */
  context: Record<string>;

  /**
   * can be used to cancel the request. Throws HttpError
   */
  get abortToken(): ReadonlyCancellationToken {
    return this._abortToken.asReadonly;
  }

  constructor(url: string, method?: HttpMethod, options?: HttpClientRequestOptions);
  constructor(requestObject: HttpClientRequestObject);
  constructor(urlOrObject: string | HttpClientRequestObject, method?: HttpMethod, options: HttpClientRequestOptions = {}) { // eslint-disable-line max-statements
    if (isString(urlOrObject)) {
      this.url = urlOrObject;
      this.method = method ?? 'GET';
    }
    else {
      this.url = urlOrObject.url;
      this.method = urlOrObject.method ?? 'GET';
    }

    const requestOptions: HttpClientRequestOptions | undefined = isString(urlOrObject) ? options : urlOrObject;

    this.headers = new HttpHeaders(requestOptions.headers);
    this.parameters = requestOptions.parameters;
    this.mapParametersToUrl = requestOptions.mapParametersToUrl ?? true;
    this.mapParametersToQuery = requestOptions.mapParametersToQuery ?? true;
    this.mapParametersToBody = requestOptions.mapParametersToBody ?? true;
    this.urlParameters = new HttpUrlParameters(requestOptions.urlParameters);
    this.urlParametersSeparator = requestOptions.urlParametersSeparator ?? ';';
    this.query = new HttpQuery(requestOptions.query);
    this.authorization = requestOptions.authorization;
    this.body = normalizeBody(requestOptions.body);
    this.credentials = requestOptions.credentials;
    this.timeout = requestOptions.timeout ?? 30000;
    this.throwOnNon200 = requestOptions.throwOnNon200 ?? true;
    this.context = requestOptions.context ?? {};

    this._abortToken = requestOptions.abortToken?.createChild() ?? new CancellationToken();
  }

  [dispose](): void {
    this._abortToken.set();
    this._abortToken.complete();
  }

  /** abort the request */
  abort(): void {
    this._abortToken.set();
    this._abortToken.complete();
  }

  clone(): HttpClientRequest {
    const request = new HttpClientRequest(this);

    request.headers = new HttpHeaders(request.headers);
    request.query = new HttpQuery(request.query);
    request.authorization = clone(request.authorization, true);
    request.urlParameters = new HttpUrlParameters(request.urlParameters);
    request.body = normalizeBody(request.body);

    return request;
  }

  asObject(): HttpClientRequestObject {
    const body: HttpClientRequestObject['body'] = isDefined(this.body?.form) ? { form: this.body!.form.asNormalizedObject() } : this.body;

    return {
      url: this.url,
      method: this.method,
      parameters: this.parameters,
      urlParameter: this.urlParameters.asObject(),
      headers: this.headers.asObject(),
      query: this.query.asObject(),
      authorization: this.authorization,
      body,
      timeout: this.timeout,
      throwOnNon200: this.throwOnNon200,
      context: this.context
    };
  }
}

function normalizeBody(body: HttpClientRequestOptions['body']): HttpClientRequest['body'] {
  if (isUndefined(body)) {
    return undefined;
  }

  const normalizedBody = { ...body };

  if (isDefined(normalizedBody.form)) {
    normalizedBody.form = new HttpForm(normalizedBody.form);
  }

  return normalizedBody as HttpClientRequest['body'];
}
