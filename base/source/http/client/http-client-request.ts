import { CancellationToken, type CancellationSignal } from '#/cancellation/index.js';
import { dispose, type Disposable } from '#/disposable/index.js';
import type { OneOrMany, Record, TypedOmit, UndefinableJson, UndefinableJsonObject } from '#/types/index.js';
import { clone } from '#/utils/clone.js';
import { objectEntries } from '#/utils/object/object.js';
import { isArray, isBlob, isDefined, isString, isUint8Array, isUndefined } from '#/utils/type-guards.js';
import { HttpForm, type HttpFormObject } from '../http-form.js';
import { HttpHeaders, type HttpHeadersObject } from '../http-headers.js';
import { HttpQuery, type HttpQueryObject } from '../http-query.js';
import { HttpUrlParameters, type HttpUrlParametersObject } from '../http-url-parameters.js';
import type { HttpMethod } from '../types.js';

/** Only one type at a time is supported. If multiple are set, behaviour is undefined */
export type HttpRequestBody = {
  text?: string,
  json?: UndefinableJson,
  form?: HttpForm,
  formData?: FormData,
  binary?: Uint8Array | Blob | ReadableStream<Uint8Array>,
};

export type HttpRequestAuthorization = {
  basic?: {
    username: string,
    password: string,
  },
  bearer?: string,
  token?: string,
};

export type HttpFormDataObjectValue = string | number | boolean | Uint8Array | Blob;
export type HttpFormDataObject = Record<string, OneOrMany<HttpFormDataObjectValue>>;

export type HttpClientRequestOptions = Partial<TypedOmit<HttpClientRequest, 'url' | 'method' | 'abortSignal' | 'abort' | 'headers' | 'query' | 'body'>> & {
  urlParameter?: HttpUrlParametersObject | HttpUrlParameters,
  headers?: HttpHeadersObject | HttpHeaders,
  query?: HttpQueryObject | HttpQuery,
  credentials?: HttpRequestCredentials,
  authorization?: HttpRequestAuthorization,
  body?: TypedOmit<HttpRequestBody, 'form' | 'formData'> & { form?: HttpFormObject | HttpForm, formData?: HttpFormDataObject | FormData },
  abortSignal?: CancellationSignal,
};

export type HttpRequestCredentials = 'omit' | 'same-origin' | 'include';

export type HttpClientRequestObject = HttpClientRequestOptions & {
  url: string,
  method?: HttpMethod,
};

export class HttpClientRequest implements Disposable {
  readonly #abortToken: CancellationToken;

  url: string;
  method: HttpMethod;
  headers: HttpHeaders;

  /**
   * Automatically maps parameters to `urlParameters`, `query` and `body`
   * depending on whether the `url` has parameters specified, the request `method`
   * and if there is already a `body` or not
   * @see mapParameters
   * @see mapParametersToUrl
   * @see mapParametersToQuery
   * @see mapParametersToBody
   */
  parameters: UndefinableJsonObject | undefined;

  /** If false, disable parameters mapping completely */
  mapParameters: boolean;
  mapParametersToUrl: boolean;
  mapParametersToQuery: boolean;
  mapParametersToBody: boolean;

  /**
   * Parameters for url
   * @example
   * {
   *   url: 'http://domain.tld/users/:userId',
   *   urlParameters: { userId: 123 }
   * }
   * // -> http://domain.tld/users/123
   */
  urlParameters: HttpUrlParameters;

  /**
   * Separator for url parameter array
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
   * Url query
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
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout: number;
  throwOnNon200: boolean;

  /**
   * Can be used to store data for middleware etc.
   *
   * will not be used for actual request
   */
  context: Record;

  /**
   * Can be used to cancel the request. Throws HttpError
   */
  get abortSignal(): CancellationSignal {
    return this.#abortToken.signal;
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
    this.mapParameters = requestOptions.mapParameters ?? true;
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

    this.#abortToken = requestOptions.abortSignal?.createChild() ?? new CancellationToken();
  }

  [dispose](): void {
    this.#abortToken.set();
    this.#abortToken.complete();
  }

  /** Abort the request */
  abort(): void {
    this.#abortToken.set();
    this.#abortToken.complete();
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
    const body: HttpClientRequestObject['body'] = isDefined(this.body?.form) ? { form: this.body.form.asNormalizedObject() } : this.body;

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
      context: this.context,
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

  if (isDefined(normalizedBody.formData) && !(normalizedBody.formData instanceof FormData)) {
    const formData = new FormData();

    for (const [key, value] of objectEntries(normalizedBody.formData)) {
      if (isArray(value)) {
        for (const item of value) {
          formData.append(key, convertFormDataObjectValue(item));
        }
      }
      else {
        formData.set(key, convertFormDataObjectValue(value));
      }
    }

    normalizedBody.formData = formData;
  }

  return normalizedBody as HttpClientRequest['body'];
}

function convertFormDataObjectValue(value: HttpFormDataObjectValue): string | Blob {
  if (isString(value) || isBlob(value)) {
    return value;
  }

  if (isUint8Array(value)) {
    return new Blob([value]);
  }

  return String(value);
}
