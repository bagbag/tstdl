import { hasErrorHandler, isErrorResponse, parseErrorResponse } from '#/api/response';
import type { Injectable } from '#/container';
import { inject, injectArg, injectionToken, optional, resolveArgumentType, singleton } from '#/container';
import type { OneOrMany, UndefinableJson } from '#/types';
import { toArray } from '#/utils/array';
import { encodeBase64 } from '#/utils/base64';
import { encodeUtf8 } from '#/utils/encoding';
import type { AsyncMiddleware, AsyncMiddlewareHandler, AsyncMiddlewareNext } from '#/utils/middleware';
import { composeAsyncMiddleware } from '#/utils/middleware';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise';
import { isDefined, isObject, isUndefined } from '#/utils/type-guards';
import { buildUrl } from '#/utils/url-builder';
import { HttpHeaders } from '../http-headers';
import { HttpError, HttpErrorReason } from '../http.error';
import type { HttpMethod, HttpValue } from '../types';
import { normalizeHttpValue, normalizeSingleHttpValue } from '../types';
import type { HttpClientRequestOptions } from './http-client-request';
import { HttpClientRequest } from './http-client-request';
import type { HttpClientResponse } from './http-client-response';
import { HttpClientAdapter } from './http-client.adapter';

export type HttpClientOptions = {
  /**
   * base url for requests when only path is provided
   */
  baseUrl?: string,

  /**
   * middlewares to add
   */
  middleware?: HttpClientMiddleware[],

  /**
   * enables parsing of response errors with registered error handlers via {@link parseErrorResponse}
   * @default true
   */
  enableErrorHandling?: boolean
};

export type HttpClientHandler = AsyncMiddlewareHandler<HttpClientRequest, HttpClientResponse>;
export type HttpClientMiddleware = AsyncMiddleware<HttpClientRequest, HttpClientResponse>;
export type HttpClientMiddlewareNext = AsyncMiddlewareNext<HttpClientRequest, HttpClientResponse>;

export const HTTP_CLIENT_OPTIONS = injectionToken<HttpClientOptions>(Symbol('HttpClientOptions'));

export type HttpClientArgument = HttpClientOptions;

@singleton()
export class HttpClient implements Injectable<HttpClientArgument> {
  private readonly adapter: HttpClientAdapter;
  private readonly options: HttpClientOptions;
  private readonly headers: HttpHeaders;
  private readonly middleware: HttpClientMiddleware[];
  private readonly internalMiddleware: HttpClientMiddleware[];

  private callHandler: HttpClientHandler;

  readonly [resolveArgumentType]: HttpClientOptions;

  constructor(adapter: HttpClientAdapter, @inject(HTTP_CLIENT_OPTIONS) @optional() @injectArg() options: HttpClientOptions = {}) {
    this.adapter = adapter;
    this.options = options;

    this.middleware = [...(options.middleware ?? [])];
    this.headers = new HttpHeaders();

    this.internalMiddleware = [
      getBuildRequestUrlMiddleware(options.baseUrl),
      addRequestHeadersMiddleware,
      ...((options.enableErrorHandling ?? true) ? [errorMiddleware] : [])
    ];

    this.updateHandlers();
  }

  addMiddleware(middleware: HttpClientMiddleware): void {
    this.middleware.push(middleware);
    this.updateHandlers();
  }

  setDefaultHeader(name: string, value: OneOrMany<HttpValue>): void {
    this.headers.set(name, value);
  }

  deleteDefaultHeader(name: string): void {
    this.headers.remove(name);
  }

  async head(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('HEAD', url, { ...options });
  }

  async get(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('GET', url, options);
  }

  async getText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('GET', url, { ...options });
    return response.body.readAsText();
  }

  async getJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('GET', url, { ...options });
    return response.body.readAsJson();
  }

  async getBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('GET', url, { ...options });
    return response.body.readAsBuffer();
  }

  getStream(url: string, options?: HttpClientRequestOptions): ReadableStream<string> | ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('GET', url, { ...options });
      return response.body.readAsStream() as ReadableStream<Uint8Array>;
    });
  }

  getTextStream(url: string, options?: HttpClientRequestOptions): ReadableStream<string> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('GET', url, { ...options });
      return response.body.readAsTextStream();
    });
  }

  getBinaryStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('GET', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async post(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('POST', url, options);
  }

  async postText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('POST', url, { ...options });
    return response.body.readAsText();
  }

  async postJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('POST', url, { ...options });
    return response.body.readAsJson();
  }

  async postBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('POST', url, { ...options });
    return response.body.readAsBuffer();
  }

  postStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('POST', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async put(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('PUT', url, options);
  }

  async putText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('PUT', url, { ...options });
    return response.body.readAsText();
  }

  async putJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('PUT', url, { ...options });
    return response.body.readAsJson();
  }

  async putBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('PUT', url, { ...options });
    return response.body.readAsBuffer();
  }

  putStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('PUT', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async patch(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('PATCH', url, options);
  }

  async patchText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('PATCH', url, { ...options });
    return response.body.readAsText();
  }

  async patchJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('PATCH', url, { ...options });
    return response.body.readAsJson();
  }

  async patchBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('PATCH', url, { ...options });
    return response.body.readAsBuffer();
  }

  patchStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('PATCH', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async delete(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('DELETE', url, options);
  }

  async deleteText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('DELETE', url, { ...options });
    return response.body.readAsText();
  }

  async deleteJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('DELETE', url, { ...options });
    return response.body.readAsJson<T>();
  }

  async deleteBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('DELETE', url, { ...options });
    return response.body.readAsBuffer();
  }

  deleteStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('DELETE', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async request(method: HttpMethod, url: string, options: HttpClientRequestOptions = {}): Promise<HttpClientResponse> {
    const request = new HttpClientRequest(url, method, options);
    return this.rawRequest(request);
  }

  async rawRequest(request: HttpClientRequest): Promise<HttpClientResponse> {
    const preparedRequest = this.prepareRequest(request);
    return this.callHandler(preparedRequest, undefined);
  }

  private updateHandlers(): void {
    this.callHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (request) => this.adapter.call(request), { allowMultipleNextCalls: true });
  }

  private prepareRequest(request: HttpClientRequest): HttpClientRequest {
    const clone = request.clone();

    clone.headers = new HttpHeaders(this.headers);
    clone.headers.setMany(request.headers);

    return clone;
  }
}

function getBuildRequestUrlMiddleware(baseUrl: string | undefined): HttpClientMiddleware {
  async function buildUrlParametersMiddleware(request: HttpClientRequest, next: HttpClientMiddlewareNext): Promise<HttpClientResponse> {
    const modifiedRequest = mapParameters(request, baseUrl);
    return next(modifiedRequest);
  }

  return buildUrlParametersMiddleware;
}

async function addRequestHeadersMiddleware(request: HttpClientRequest, next: HttpClientMiddlewareNext): Promise<HttpClientResponse> {
  const clone = request.clone();
  const { body, authorization } = clone;

  if (isDefined(body) && isUndefined(clone.headers.contentType)) {
    if (isDefined(body.json)) {
      clone.headers.contentType = 'application/json';
    }
    else if (isDefined(body.text)) {
      clone.headers.contentType = 'text/plain';
    }
    else if (isDefined(body.form)) {
      clone.headers.contentType = 'application/x-www-form-urlencoded';
    }
    else if (isDefined(body.blob)) {
      clone.headers.contentType = (body.blob.type.length > 0) ? body.blob.type : 'application/octet-stream';
    }
    else if (isDefined(body.stream) || isDefined(body.buffer)) {
      clone.headers.contentType = 'application/octet-stream';
    }
  }

  if (isDefined(authorization) && isUndefined(clone.headers.authorization)) {
    if (isDefined(authorization.basic)) {
      const base64 = encodeBase64(encodeUtf8(`${authorization.basic.username}:${authorization.basic.password}`));
      clone.headers.authorization = `Basic ${base64}`;
    }
    else if (isDefined(authorization.bearer)) {
      clone.headers.authorization = `Bearer ${authorization.bearer}`;
    }
    else if (isDefined(authorization.token)) {
      clone.headers.authorization = `Token ${authorization.token}`;
    }
  }

  return next(clone);
}

async function errorMiddleware(request: HttpClientRequest, next: HttpClientMiddlewareNext): Promise<HttpClientResponse> {
  try {
    const response = await next(request);

    if (request.throwOnNon200 && ((response.statusCode < 200) || (response.statusCode >= 300))) {
      const httpError = await HttpError.create(HttpErrorReason.Non200StatusCode, request, response, `Status code ${response.statusCode}.`);
      throw httpError;
    }

    return response;
  }
  catch (error: unknown) {
    if (!(error instanceof HttpError) || (error.responseInstance?.headers.contentType?.includes('json') == false)) {
      throw error;
    }

    const body = error.response?.body;

    if (isDefined(body)) {
      if (!isErrorResponse(body) || !hasErrorHandler(body)) {
        throw error;
      }

      const parsedError = parseErrorResponse(body, false);

      if (isDefined(parsedError)) {
        throw parsedError;
      }
    }

    throw error;
  }
}

// eslint-disable-next-line max-statements, max-lines-per-function, complexity
function mapParameters(request: HttpClientRequest, baseUrl?: string): HttpClientRequest {
  const clone = request.clone();

  const isGetOrHead = (request.method == 'GET') || (request.method == 'HEAD');

  let url: URL;
  const filteredParameterEntries = Object.entries(request.parameters ?? {}).filter(([_, value]) => isDefined(value));
  const filteredParameters = Object.fromEntries(filteredParameterEntries);
  let parameterEntries = new Set(filteredParameterEntries);

  if (!request.mapParametersToUrl) {
    url = new URL(request.url, baseUrl);
  }
  else {
    const { parsedUrl, parametersRest } = buildUrl(request.url, filteredParameters, { arraySeparator: request.urlParametersSeparator });

    url = new URL(parsedUrl, baseUrl);
    parameterEntries = new Set(Object.entries(parametersRest));
  }

  if (request.mapParametersToBody && !isGetOrHead && isUndefined(request.body)) {
    clone.body = { json: Object.fromEntries(parameterEntries) };
    parameterEntries.clear();
  }

  if (request.mapParametersToQuery) {
    for (const entry of parameterEntries) {
      const [parameter, value] = entry;

      if (isUndefined(value) || isObject(value)) {
        continue;
      }

      for (const val of toArray(value)) {
        url.searchParams.append(parameter, normalizeSingleHttpValue(val));
      }

      parameterEntries.delete(entry);
    }
  }

  if (parameterEntries.size > 0) {
    throw new HttpError(HttpErrorReason.InvalidRequest, request, undefined, 'Not all parameters could be mapped to url, query and body because request is either GET/HEAD or body is already defined');
  }

  if (isDefined(request.query)) {
    for (const [key, valueOrValues] of request.query) {
      const normalizedValues = normalizeHttpValue(valueOrValues);

      if (isDefined(normalizedValues)) {
        for (const normalizedValue of toArray(normalizedValues)) {
          url.searchParams.append(key, normalizedValue.toString());
        }
      }
    }
  }

  clone.url = url.href;

  return clone;
}
