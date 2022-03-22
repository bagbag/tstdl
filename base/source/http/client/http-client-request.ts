import type { Disposable } from '#/disposable';
import { dispose } from '#/disposable';
import type { StringMap, TypedOmit, UndefinableJson, UndefinableJsonObject } from '#/types';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import { CancellationToken } from '#/utils/cancellation-token';
import { isDefined, isString, isUndefined } from '#/utils/type-guards';
import type { HttpFormObject } from '../http-form';
import { HttpForm } from '../http-form';
import type { HttpHeadersObject } from '../http-headers';
import { HttpHeaders } from '../http-headers';
import type { HttpQueryObject } from '../http-query';
import { HttpQuery } from '../http-query';
import type { HttpUrlParametersObject } from '../http-url-parameters';
import { HttpUrlParameters } from '../http-url-parameters';
import type { HttpBodyType, HttpMethod } from '../types';

interface HttpClientRequestDocs {
  /**
   * can be used to cancel the request. Throws HttpError
   */
  readonly abortToken: ReadonlyCancellationToken;

  /**
   * automatically maps parameters to `urlParameters`, `query` and `body`
   * depending on whether the `url` has parameters specified, the request `method`
   * and if there is already a `body` or not
   * @see mapParametersToUrl
   * @see mapParametersToQuery
   * @see mapParametersToBody
   */
  parameters: UndefinableJsonObject | undefined;

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

  /**
   * request timeout in milliseconds
   * @default 30000
   */
  timeout: number | undefined;

  /**
   * can be used to store data for middleware etc.
   *
   * will not be used for actual request
   */
  context: StringMap;
}

/** only one type at a time is supported. If multiple are set, behaviour is undefined */
export type HttpRequestBody = undefined | {
  text?: string,
  json?: UndefinableJson,
  form?: HttpForm,
  buffer?: Uint8Array,
  stream?: AsyncIterable<Uint8Array>
};

export type HttpClientRequestOptions<T extends HttpBodyType = HttpBodyType> = Partial<TypedOmit<HttpClientRequest<T>, 'url' | 'method' | 'abortToken' | 'abort' | 'headers' | 'query' | 'body'>> & {
  urlParameter?: HttpUrlParametersObject | HttpUrlParameters,
  headers?: HttpHeadersObject | HttpHeaders,
  query?: HttpQueryObject | HttpQuery,
  body?: undefined | {
    text?: string,
    json?: UndefinableJson,
    form?: HttpFormObject | HttpForm,
    buffer?: Uint8Array,
    stream?: AsyncIterable<Uint8Array>
  },
  abortToken?: ReadonlyCancellationToken
};

export type HttpClientRequestObject<T extends HttpBodyType = HttpBodyType> = HttpClientRequestOptions<T> & {
  url: string,
  method?: HttpMethod
};

export type CredentialsOptions = 'omit' | 'same-origin' | 'include';

export class HttpClientRequest<T extends HttpBodyType = HttpBodyType> implements HttpClientRequestDocs, Disposable {
  private readonly _abortToken: CancellationToken;

  url: string;
  method: HttpMethod;
  headers: HttpHeaders;
  parameters: UndefinableJsonObject | undefined;
  mapParametersToUrl: boolean;
  mapParametersToQuery: boolean;
  mapParametersToBody: boolean;
  urlParameters: HttpUrlParameters;
  urlParametersSeparator: string;
  query: HttpQuery;
  body: HttpRequestBody;
  responseType: T;
  credentials: CredentialsOptions;
  timeout: number;
  throwOnNon200: boolean;
  context: StringMap;

  get abortToken(): ReadonlyCancellationToken {
    return this._abortToken.asReadonly;
  }

  constructor(url: string, method?: HttpMethod, options?: HttpClientRequestOptions<T>);
  constructor(requestObject: HttpClientRequestObject<T>);
  constructor(urlOrObject: string | HttpClientRequestObject<T>, method?: HttpMethod, options: HttpClientRequestOptions<T> = {}) { // eslint-disable-line max-statements
    if (isString(urlOrObject)) {
      this.url = urlOrObject;
      this.method = method ?? 'GET';
    }
    else {
      this.url = urlOrObject.url;
      this.method = urlOrObject.method ?? 'GET';
    }

    const requestOptions: HttpClientRequestOptions<T> | undefined = isString(urlOrObject) ? options : urlOrObject;

    this.headers = new HttpHeaders(requestOptions.headers);
    this.parameters = requestOptions.parameters;
    this.mapParametersToUrl = requestOptions.mapParametersToUrl ?? true;
    this.mapParametersToQuery = requestOptions.mapParametersToQuery ?? true;
    this.mapParametersToBody = requestOptions.mapParametersToBody ?? true;
    this.urlParameters = new HttpUrlParameters(requestOptions.urlParameters);
    this.urlParametersSeparator = requestOptions.urlParametersSeparator ?? ';';
    this.query = new HttpQuery(requestOptions.query);
    this.body = normalizeBody(requestOptions.body);
    this.responseType = requestOptions.responseType ?? 'auto' as T;
    this.credentials = requestOptions.credentials ?? 'omit';
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

  clone(): HttpClientRequest<T> {
    const request = new HttpClientRequest(this);

    request.headers = new HttpHeaders(request.headers);
    request.query = new HttpQuery(request.query);
    request.urlParameters = new HttpUrlParameters(request.urlParameters);
    request.body = normalizeBody(request.body);

    return request;
  }

  asObject(): HttpClientRequestObject<T> {
    const body: HttpClientRequestObject['body'] = isDefined(this.body?.form) ? { form: this.body!.form.asNormalizedObject() } : this.body;

    return {
      url: this.url,
      method: this.method,
      parameters: this.parameters,
      urlParameter: this.urlParameters.asObject(),
      headers: this.headers.asObject(),
      query: this.query.asObject(),
      body,
      responseType: this.responseType,
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
