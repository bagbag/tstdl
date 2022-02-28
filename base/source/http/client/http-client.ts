import { hasErrorHandler, isErrorResponse, parseErrorResponse } from '#/api/response';
import { inject, injectionToken, optional, singleton } from '#/container';
import type { OneOrMany, UndefinableJson } from '#/types';
import { toArray } from '#/utils/array';
import type { AsyncMiddlerwareHandler, AsyncMiddleware } from '#/utils/middleware';
import { composeAsyncMiddleware } from '#/utils/middleware';
import { isDefined, isObject, isUndefined } from '#/utils/type-guards';
import { buildUrl } from '#/utils/url-builder';
import { HttpHeaders } from '../http-headers';
import { HttpError, HttpErrorReason } from '../http.error';
import type { HttpBodyType, HttpBufferBodyType, HttpJsonBodyType, HttpMethod, HttpStreamBodyType, HttpTextBodyType, HttpValue } from '../types';
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
   * enables parsing of response errors with registered error handlers via {@link parseErrorResponse}
   */
  enableErrorHandling?: boolean
};

export type HttpClientHandler = AsyncMiddlerwareHandler<HttpClientRequest, HttpClientResponse>;

export type HttpClientMiddleware = AsyncMiddleware<HttpClientRequest, HttpClientResponse>;

export const HTTP_CLIENT_OPTIONS = injectionToken<HttpClientOptions>(Symbol('HttpClientOptions'));

@singleton()
export class HttpClient {
  private static _instance?: HttpClient;

  private readonly adapter: HttpClientAdapter;
  private readonly options: HttpClientOptions;
  private readonly headers: HttpHeaders;
  private readonly middleware: HttpClientMiddleware[];
  private readonly internalMiddleware: HttpClientMiddleware[];

  private callHandler: HttpClientHandler;

  static get instance(): HttpClient {
    if (isUndefined(this._instance)) {
      throw new Error('global instance not configured');
    }

    return this._instance;
  }

  constructor(adapter: HttpClientAdapter, @inject(HTTP_CLIENT_OPTIONS) @optional() options: HttpClientOptions = {}) {
    this.adapter = adapter;
    this.options = options;

    this.middleware = [];
    this.headers = new HttpHeaders();

    this.internalMiddleware = [
      getBuildRequestUrlMiddleware(options.baseUrl),
      addRequestHeadersMiddleware,
      ...((options.enableErrorHandling ?? false) ? [errorMiddleware] : [])
    ];

    this.updateHandlers();
  }

  static configureGlobalInstance(adapter: HttpClientAdapter, options: HttpClientOptions = {}): void {
    this._instance = new HttpClient(adapter, options);
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
    return this.request('head', url, { ...options, responseType: 'buffer' });
  }

  async get<T extends HttpBodyType = HttpBodyType>(url: string, options?: HttpClientRequestOptions<T>): Promise<HttpClientResponse<T>> {
    return this.request('get', url, options);
  }

  async getText(url: string, options?: HttpClientRequestOptions<HttpTextBodyType>): Promise<string> {
    const response = await this.request('get', url, { ...options, responseType: 'text' });
    return response.body;
  }

  async getJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions<HttpJsonBodyType>): Promise<T> {
    const response = await this.request('get', url, { ...options, responseType: 'json' });
    return response.body as T;
  }

  async getBuffer(url: string, options?: HttpClientRequestOptions<HttpBufferBodyType>): Promise<Uint8Array> {
    const response = await this.request('get', url, { ...options, responseType: 'buffer' });
    return response.body;
  }

  async *getStream(url: string, options?: HttpClientRequestOptions<HttpStreamBodyType>): AsyncIterableIterator<Uint8Array> {
    const response = await this.request('get', url, { ...options, responseType: 'stream' });
    yield* response.body;
  }

  async post<T extends HttpBodyType = HttpBodyType>(url: string, options?: HttpClientRequestOptions<T>): Promise<HttpClientResponse<T>> {
    return this.request('post', url, options);
  }

  async postText(url: string, options?: HttpClientRequestOptions<HttpTextBodyType>): Promise<string> {
    const response = await this.request('post', url, { ...options, responseType: 'text' });
    return response.body;
  }

  async postJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions<HttpJsonBodyType>): Promise<T> {
    const response = await this.request('post', url, { ...options, responseType: 'json' });
    return response.body as T;
  }

  async postBuffer(url: string, options?: HttpClientRequestOptions<HttpBufferBodyType>): Promise<Uint8Array> {
    const response = await this.request('post', url, { ...options, responseType: 'buffer' });
    return response.body;
  }

  async *postStream(url: string, options?: HttpClientRequestOptions<HttpStreamBodyType>): AsyncIterableIterator<Uint8Array> {
    const response = await this.request('post', url, { ...options, responseType: 'stream' });
    yield* response.body;
  }

  async put<T extends HttpBodyType = HttpBodyType>(url: string, options?: HttpClientRequestOptions<T>): Promise<HttpClientResponse<T>> {
    return this.request('put', url, options);
  }

  async putText(url: string, options?: HttpClientRequestOptions<HttpTextBodyType>): Promise<string> {
    const response = await this.request('put', url, { ...options, responseType: 'text' });
    return response.body;
  }

  async putJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions<HttpJsonBodyType>): Promise<T> {
    const response = await this.request('put', url, { ...options, responseType: 'json' });
    return response.body as T;
  }

  async putBuffer(url: string, options?: HttpClientRequestOptions<HttpBufferBodyType>): Promise<Uint8Array> {
    const response = await this.request('put', url, { ...options, responseType: 'buffer' });
    return response.body;
  }

  async *putStream(url: string, options?: HttpClientRequestOptions<HttpStreamBodyType>): AsyncIterableIterator<Uint8Array> {
    const response = await this.request('put', url, { ...options, responseType: 'stream' });
    yield* response.body;
  }

  async patch<T extends HttpBodyType = HttpBodyType>(url: string, options?: HttpClientRequestOptions<T>): Promise<HttpClientResponse<T>> {
    return this.request('patch', url, options);
  }

  async patchText(url: string, options?: HttpClientRequestOptions<HttpTextBodyType>): Promise<string> {
    const response = await this.request('patch', url, { ...options, responseType: 'text' });
    return response.body;
  }

  async patchJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions<HttpJsonBodyType>): Promise<T> {
    const response = await this.request('patch', url, { ...options, responseType: 'json' });
    return response.body as T;
  }

  async patchBuffer(url: string, options?: HttpClientRequestOptions<HttpBufferBodyType>): Promise<Uint8Array> {
    const response = await this.request('patch', url, { ...options, responseType: 'buffer' });
    return response.body;
  }

  async *patchStream(url: string, options?: HttpClientRequestOptions<HttpStreamBodyType>): AsyncIterableIterator<Uint8Array> {
    const response = await this.request('patch', url, { ...options, responseType: 'stream' });
    yield* response.body;
  }

  async delete<T extends HttpBodyType = HttpBodyType>(url: string, options?: HttpClientRequestOptions<T>): Promise<HttpClientResponse<T>> {
    return this.request('delete', url, options);
  }

  async deleteText(url: string, options?: HttpClientRequestOptions<HttpTextBodyType>): Promise<string> {
    const response = await this.request('delete', url, { ...options, responseType: 'text' });
    return response.body;
  }

  async deleteJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions<HttpJsonBodyType>): Promise<T> {
    const response = await this.request('delete', url, { ...options, responseType: 'json' });
    return response.body as T;
  }

  async deleteBuffer(url: string, options?: HttpClientRequestOptions<HttpBufferBodyType>): Promise<Uint8Array> {
    const response = await this.request('delete', url, { ...options, responseType: 'buffer' });
    return response.body;
  }

  async *deleteStream(url: string, options?: HttpClientRequestOptions<HttpStreamBodyType>): AsyncIterableIterator<Uint8Array> {
    const response = await this.request('delete', url, { ...options, responseType: 'stream' });
    yield* response.body;
  }

  async request<T extends HttpBodyType = HttpBodyType>(method: HttpMethod, url: string, options: HttpClientRequestOptions<T> = {}): Promise<HttpClientResponse<T>> {
    const request = new HttpClientRequest<T>(url, method, options);
    return this.rawRequest(request);
  }

  async rawRequest<T extends HttpBodyType = HttpBodyType>(request: HttpClientRequest<T>): Promise<HttpClientResponse<T>> {
    const preparedRequest = this.prepareRequest(request);
    const response = await this.callHandler(preparedRequest);

    return response;
  }

  private updateHandlers(): void {
    this.callHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (request) => this.adapter.call(request), { allowMultipleNextCalls: true });
  }

  private prepareRequest<T extends HttpBodyType = HttpBodyType>(request: HttpClientRequest<T>): HttpClientRequest<T> {
    const clone = request.clone();

    clone.headers = new HttpHeaders(this.headers);
    clone.headers.setMany(request.headers);

    return clone;
  }
}

function getBuildRequestUrlMiddleware(baseUrl: string | undefined): HttpClientMiddleware {
  async function buildUrlParametersMiddleware(request: HttpClientRequest, next: HttpClientHandler): Promise<HttpClientResponse> {
    const modifiedRequest = mapParameters(request, baseUrl);
    return next(modifiedRequest);
  }

  return buildUrlParametersMiddleware;
}

async function addRequestHeadersMiddleware(request: HttpClientRequest, next: HttpClientHandler): Promise<HttpClientResponse> {
  const clone = request.clone();

  if (isDefined(clone.body?.json)) {
    clone.headers.contentType = 'application/json';
  }
  else if (isDefined(clone.body?.text)) {
    clone.headers.contentType = 'text/plain';
  }
  else if (isDefined(clone.body?.form)) {
    clone.headers.contentType = 'application/x-www-form-urlencoded';
  }
  else if (isDefined(clone.body?.stream) || isDefined(clone.body?.buffer)) {
    clone.headers.contentType = 'application/octet-stream';
  }

  return next(clone);
}

async function errorMiddleware(request: HttpClientRequest, next: HttpClientHandler): Promise<HttpClientResponse> {
  try {
    const response = await next(request);
    return response;
  }
  catch (error: unknown) {
    if (!(error instanceof HttpError) || (error.responseInstance?.headers.contentType?.includes('json') == false)) {
      throw error;
    }

    const body = await error.response!.body;

    if (!isErrorResponse(body) || hasErrorHandler(body)) {
      throw error;
    }

    const parsedError = parseErrorResponse(body, false);

    if (isDefined(parsedError)) {
      throw parsedError;
    }

    throw error;
  }
}

// eslint-disable-next-line max-statements, max-lines-per-function, complexity
function mapParameters(request: HttpClientRequest, baseUrl?: string): HttpClientRequest {
  const clone = request.clone();

  const isGetOrHead = (request.method == 'get') || (request.method == 'head');

  let url: URL;
  let parameterEntries = new Set(Object.entries(request.parameters ?? {}));

  if (!request.mapParametersToUrl) {
    url = new URL(request.url, baseUrl);
  }
  else {
    const { parsedUrl, parametersRest } = buildUrl(request.url, request.parameters, { arraySeparator: request.urlParametersSeparator });

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
    const error = new Error('not all parameters could be mapped to url, query and body because request is either GET/HEAD or body is already defined');
    throw new HttpError(HttpErrorReason.InvalidRequest, request, undefined, error);
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
