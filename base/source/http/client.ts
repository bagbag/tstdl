import type { JsonPrimitive, UndefinableJson, UndefinableJsonInnerNode, UndefinableJsonObject } from '../types';
import type { AsyncMiddlerwareHandler, AsyncMiddleware } from '../utils';
import { buildUrl, composeAsyncMiddleware, isArray, isDefined, isNull, isObject, isUndefined, stripPropertyWhenUndefined, toArray } from '../utils';
import { HttpError, HttpErrorReason } from './http.error';
import type { HttpBodyType, HttpClientRequest, HttpClientRequestOptions, HttpClientResponse, HttpMethod, HttpParameters, HttpValue, NormalizedHttpClientRequest, NormalizedHttpValue, NormalizedHttpValueMap } from './types';

export interface HttpClientAdapter {
  call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>>;
  callStream(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<'stream'>>;
}

export type HttpClientHandler = AsyncMiddlerwareHandler<HttpClientRequest, HttpClientResponse>;

export type HttpClientMiddleware = AsyncMiddleware<HttpClientRequest, HttpClientResponse>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpClient {
  private static _instance?: HttpClient;

  private readonly adapter: HttpClientAdapter;
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

  constructor(adapter: HttpClientAdapter, baseUrl?: string) {
    this.adapter = adapter;

    this.middleware = [];
    this.headers = new Map();

    this.internalMiddleware = [
      getBuildRequestUrlMiddleware(baseUrl)
    ];

    this.updateHandlers();
  }

  static configureGlobalInstance(adapter: HttpClientAdapter, baseUrl?: string): void {
    this._instance = new HttpClient(adapter, baseUrl);
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
    return this.call('head', url, responseType, options);
  }

  async get<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.call('get', url, responseType, options);
  }

  async getString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.call('get', url, 'text', options);
    return response.body;
  }

  async getJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.call('get', url, 'json', options);
    return response.body as T;
  }

  async getBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('get', url, 'buffer', options);
    return response.body;
  }

  async *getStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.callStream('get', url, options);
    yield* response.body;
  }

  async post<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.call('post', url, responseType, options);
  }

  async postString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.call('post', url, 'text', options);
    return response.body;
  }

  async postJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.call('post', url, 'json', options);
    return response.body as T;
  }

  async postBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('post', url, 'buffer', options);
    return response.body;
  }

  async *postStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.callStream('post', url, options);
    yield* response.body;
  }

  async put<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.call('put', url, responseType, options);
  }

  async putString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.call('put', url, 'text', options);
    return response.body;
  }

  async putJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.call('put', url, 'json', options);
    return response.body as T;
  }

  async putBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('put', url, 'buffer', options);
    return response.body;
  }

  async *putStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.callStream('put', url, options);
    yield* response.body;
  }

  async patch<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.call('patch', url, responseType, options);
  }

  async patchString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.call('patch', url, 'text', options);
    return response.body;
  }

  async patchJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.call('patch', url, 'json', options);
    return response.body as T;
  }

  async patchBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('patch', url, 'buffer', options);
    return response.body;
  }

  async *patchStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.callStream('patch', url, options);
    yield* response.body;
  }

  async delete<T extends HttpBodyType>(url: string, responseType: T, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return this.call('delete', url, responseType, options);
  }

  async deleteString(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.call('delete', url, 'text', options);
    return response.body;
  }

  async deleteJson<T extends UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.call('delete', url, 'json', options);
    return response.body as T;
  }

  async deleteBuffer(url: string, options?: HttpClientRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('delete', url, 'buffer', options);
    return response.body;
  }

  async *deleteStream(url: string, options?: HttpClientRequestOptions): AsyncIterableIterator<ArrayBuffer> {
    const response = await this.callStream('delete', url, options);
    yield* response.body;
  }

  private updateHandlers(): void {
    this.callHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (request) => this.adapter.call(normalizedHttpClientRequest(request)));

    this.callStreamHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (request) => this.adapter.callStream(normalizedHttpClientRequest(request)));
  }

  private async call<T extends HttpBodyType>(method: HttpMethod, url: string, responseType: T, options: HttpClientRequestOptions = {}): Promise<HttpClientResponse<T>> {
    const request: HttpClientRequest = { url, method, responseType, ...options };
    const preparedRequest = this.prepareRequest(request);

    return this.callHandler(preparedRequest);
  }

  private async callStream(method: HttpMethod, url: string, options: HttpClientRequestOptions = {}): Promise<HttpClientResponse<'stream'>> {
    const request: HttpClientRequest = { url, method, responseType: 'stream', ...options };
    const preparedRequest = this.prepareRequest(request);

    return this.callStreamHandler(preparedRequest);
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

function normalizedHttpClientRequest(request: HttpClientRequest): NormalizedHttpClientRequest {
  const normalizedRequest: NormalizedHttpClientRequest = stripPropertyWhenUndefined({
    url: request.url,
    method: request.method,
    responseType: request.responseType,
    headers: normalizeHttpParameters(request.headers),
    body: stripPropertyWhenUndefined({
      form: normalizeHttpParameters(request.body?.form),
      json: request.body?.json,
      text: request.body?.text,
      buffer: request.body?.buffer,
      stream: request.body?.stream
    }),
    timeout: request.timeout,
    context: request.context
  });

  return normalizedRequest;
}

function normalizeHttpParameters(parameters: HttpParameters | undefined): NormalizedHttpValueMap | undefined {
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

function normalizeHttpValue(value: UndefinableJsonInnerNode): NormalizedHttpValue | NormalizedHttpValue[] | undefined {
  if (isUndefined(value)) {
    return undefined;
  }

  if (isArray(value)) {
    const normalizedArray = value.map(normalizeHttpValue).filter(isDefined) as NormalizedHttpValue[];
    return (normalizedArray.length > 0) ? normalizedArray : undefined;
  }

  return normalizeSingleHttpValue(value);
}

function normalizeSingleHttpValue(value: JsonPrimitive | UndefinableJsonObject): NormalizedHttpValue | undefined {
  if (isObject(value)) {
    return JSON.stringify(value);
  }

  if (isNull(value)) {
    return '[[null]]';
  }

  return value.toString();
}
