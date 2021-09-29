import { hasErrorHandler, isErrorResponse, parseErrorResponse } from '#/api';
import type { UndefinableJson } from '../types';
import type { AsyncMiddlerwareHandler, AsyncMiddleware } from '../utils';
import { buildUrl, CancellationToken, composeAsyncMiddleware, isArray, isDefined, isObject, isUndefined, toArray } from '../utils';
import { HttpError, HttpErrorReason } from './http.error';
import type { HttpBodyType, HttpClientRequest, HttpClientRequestOptions, HttpClientResponse, HttpHeaders, HttpMethod, HttpValue, NormalizedHttpClientRequest } from './types';
import { abortToken, normalizedHttpClientRequest, normalizeHttpValue } from './types';

export interface HttpClientAdapter {
  call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>>;
  callStream(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<'stream'>>;
}

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

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpClient {
  private static _instance?: HttpClient;

  private readonly adapter: HttpClientAdapter;
  private readonly options: HttpClientOptions;
  private readonly headers: Map<string, HttpValue | HttpValue[]>;
  private readonly middleware: HttpClientMiddleware[];
  private readonly internalMiddleware: HttpClientMiddleware[];

  private callHandler: HttpClientHandler;
  private callStreamHandler: HttpClientHandler;

  static get instance(): HttpClient {
    if (isUndefined(this._instance)) {
      throw new Error('global instance not configured');
    }

    return this._instance;
  }

  constructor(adapter: HttpClientAdapter, options: HttpClientOptions = {}) {
    this.adapter = adapter;
    this.options = options;

    this.middleware = [];
    this.headers = new Map();

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

  setDefaultHeader(name: string, value: HttpValue | HttpValue[]): void {
    this.headers.set(name, value);
  }

  deleteDefaultHeader(name: string): void {
    this.headers.delete(name);
  }

  async head<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.request('head', url, responseType, options);
  }

  async get<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.request('get', url, responseType, options);
  }

  async getString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('get', url, 'text', options);
    return response.body;
  }

  async getJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('get', url, 'json', options);
    return response.body as T;
  }

  async getBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.request('get', url, 'buffer', options);
    return response.body;
  }

  async *getStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.requestStream('get', url, options);
    yield* response.body;
  }

  async post<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.request('post', url, responseType, options);
  }

  async postString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('post', url, 'text', options);
    return response.body;
  }

  async postJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('post', url, 'json', options);
    return response.body as T;
  }

  async postBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.request('post', url, 'buffer', options);
    return response.body;
  }

  async *postStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.requestStream('post', url, options);
    yield* response.body;
  }

  async put<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.request('put', url, responseType, options);
  }

  async putString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('put', url, 'text', options);
    return response.body;
  }

  async putJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('put', url, 'json', options);
    return response.body as T;
  }

  async putBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.request('put', url, 'buffer', options);
    return response.body;
  }

  async *putStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.requestStream('put', url, options);
    yield* response.body;
  }

  async patch<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.request('patch', url, responseType, options);
  }

  async patchString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('patch', url, 'text', options);
    return response.body;
  }

  async patchJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('patch', url, 'json', options);
    return response.body as T;
  }

  async patchBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.request('patch', url, 'buffer', options);
    return response.body;
  }

  async *patchStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.requestStream('patch', url, options);
    yield* response.body;
  }

  async delete<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.request('delete', url, responseType, options);
  }

  async deleteString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('delete', url, 'text', options);
    return response.body;
  }

  async deleteJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('delete', url, 'json', options);
    return response.body as T;
  }

  async deleteBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.request('delete', url, 'buffer', options);
    return response.body;
  }

  async *deleteStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.requestStream('delete', url, options);
    yield* response.body;
  }

  async request<T extends HttpBodyType>(method: HttpMethod, url: string, responseType: T, options: HttpClientRequestOptions = {}): Promise<HttpClientResponse<T>> {
    const request: HttpClientRequest = {
      url,
      method,
      responseType,
      [abortToken]: options.abortToken?.createChild('set') ?? new CancellationToken(),
      ...options
    };

    const preparedRequest = this.prepareRequest(request);
    const response = await this.callHandler(preparedRequest);
    request[abortToken].complete();

    return response;
  }

  async requestStream(method: HttpMethod, url: string, options: HttpClientRequestOptions = {}): Promise<HttpClientResponse<'stream'>> {
    const request: HttpClientRequest = {
      url,
      method,
      responseType: 'stream',
      [abortToken]: options.abortToken?.createChild('set') ?? new CancellationToken(),
      ...options
    };

    const preparedRequest = this.prepareRequest(request);
    const response = await this.callStreamHandler(preparedRequest);
    request[abortToken].complete();

    return response;
  }

  private updateHandlers(): void {
    this.callHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (request) => this.adapter.call(normalizedHttpClientRequest(request)));
    this.callStreamHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (request) => this.adapter.callStream(normalizedHttpClientRequest(request)));
  }

  private prepareRequest(request: HttpClientRequest): HttpClientRequest {
    const headers = Object.fromEntries([...this.headers, ...Object.entries(request.headers ?? {})]);
    const preparedRequest: HttpClientRequest = { ...request, headers };

    return preparedRequest;
  }
}

function getBuildRequestUrlMiddleware(baseUrl: string | undefined): HttpClientMiddleware {
  async function buildUrlParametersMiddleware(request: HttpClientRequest, next: HttpClientHandler): Promise<HttpClientResponse> {
    const modifiedRequest = mapParameters(request, baseUrl);
    return next(modifiedRequest);
  }

  return buildUrlParametersMiddleware;
}

function setHeader(headers: HttpHeaders, key: string, value: string): void {
  if (!isDefined(headers[key])) {
    headers[key] = value;
  }
}

async function addRequestHeadersMiddleware(request: HttpClientRequest, next: HttpClientHandler): Promise<HttpClientResponse> {
  const headers = { ...request.headers };
  let updatedHeaders = false;

  if (request.responseType == 'text') {
    setHeader(headers, 'Accept', 'text/plain');
    updatedHeaders = true;
  }
  else if (request.responseType == 'json') {
    setHeader(headers, 'Accept', 'application/json');
    updatedHeaders = true;
  }

  if (isDefined(request.body)) {
    if (isDefined(request.body.json)) {
      setHeader(headers, 'Content-Type', 'application/json');
      updatedHeaders = true;
    }
    else if (isDefined(request.body.text)) {
      setHeader(headers, 'Content-Type', 'text/plain');
      updatedHeaders = true;
    }
    else if (isDefined(request.body.form)) {
      setHeader(headers, 'Content-Type', 'application/x-www-form-urlencoded');
      updatedHeaders = true;
    }
    else if (isDefined(request.body.stream) || isDefined(request.body.buffer)) {
      setHeader(headers, 'Content-Type', 'application/octet-stream');
      updatedHeaders = true;
    }
  }

  return next(updatedHeaders ? { ...request, headers } : request);
}

async function errorMiddleware(request: HttpClientRequest, next: HttpClientHandler): Promise<HttpClientResponse> {
  try {
    return await next(request);
  }
  catch (error: unknown) {
    if ((error instanceof HttpError) && isErrorResponse(error.response?.body) && hasErrorHandler(error.response!.body)) {
      const parsedError = parseErrorResponse(error.response!.body, false);

      if (isDefined(parsedError)) {
        throw parsedError;
      }
    }

    throw error;
  }
}

// eslint-disable-next-line max-statements, max-lines-per-function
function mapParameters(request: HttpClientRequest, baseUrl?: string): HttpClientRequest {
  const isGetOrHead = (request.method == 'get') || (request.method == 'head');

  let url: URL;
  let parameterEntries = new Set(Object.entries(request.parameters ?? {}));

  if (request.mapParametersToUrl == false) {
    url = new URL(request.url, baseUrl);
  }
  else {
    const { parsedUrl, parametersRest } = buildUrl(request.url, request.parameters, { separator: request.urlParametersSeparator });

    url = new URL(parsedUrl, baseUrl);
    parameterEntries = new Set(Object.entries(parametersRest));
  }

  if (request.mapParametersToQuery != false) {
    for (const entry of parameterEntries) {
      const [parameter, value] = entry;

      if (isUndefined(value)) {
        continue;
      }

      const valueIsObjectOrArray = isObject(value) || isArray(value);

      if (valueIsObjectOrArray && !isGetOrHead && isUndefined(request.body)) {
        continue;
      }

      const normalizedValueOrValues = normalizeHttpValue(value);

      if (isDefined(normalizedValueOrValues)) {
        for (const normalizedValue of toArray(normalizedValueOrValues)) {
          url.searchParams.append(parameter, normalizedValue);
        }

        parameterEntries.delete(entry);
      }
    }
  }

  if (isDefined(request.query)) {
    for (const [key, valueOrValues] of Object.entries(request.query)) {
      const normalizedValues = normalizeHttpValue(valueOrValues);

      if (isDefined(normalizedValues)) {
        for (const normalizedValue of toArray(normalizedValues)) {
          url.searchParams.append(key, normalizedValue.toString());
        }
      }
    }
  }

  const modifiedRequest = { ...request, url: url.href };

  if (parameterEntries.size > 0) {
    if (isDefined(request.body)) {
      const error = new Error('not all parameters could be mapped to url and query but cannot map to body because it is already defined');
      throw new HttpError(HttpErrorReason.InvalidRequest, request, undefined, error);
    }

    if (isGetOrHead) {
      const error = new Error('cannot map parameters to body because request is GET/HEAD');
      throw new HttpError(HttpErrorReason.InvalidRequest, request, undefined, error);
    }

    modifiedRequest.body = { json: Object.fromEntries(parameterEntries) };
  }

  return modifiedRequest;
}
