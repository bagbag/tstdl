import { isIterable } from '#/utils/iterable-helpers';
import type { Readable } from 'stream';
import type { Json, StringMap, UndefinableJson } from '../types';
import type { AsyncMiddlerwareHandler, AsyncMiddleware } from '../utils';
import { buildUrl, composeAsyncMiddleware, isArray, isDefined, isUndefined, toArray } from '../utils';

export type HttpRequestOptions = {
  headers?: HttpHeaders,
  parameters?: HttpParameters,
  mapUrlParameters?: boolean,
  hash?: string,
  body?: {
    form?: HttpForm,
    json?: Json,
    text?: string,
    buffer?: ArrayBuffer,
    readable?: Readable
  },
  timeout?: number,
  context?: Record<any, unknown>
};

type HttpValueEntry = [string, HttpValue | HttpValue[]];

export type HttpValue = string | number | boolean | undefined;

export type HttpValueMap = StringMap<HttpValue | HttpValue[]>;

export type NormalizedHttpValueMap = StringMap<string | string[]>;

export type HttpRequest = { url: string, method: HttpMethod, responseType: HttpResponseType } & HttpRequestOptions;

export type HttpHeaders = HttpValueMap;

export type HttpParameters = HttpValueMap;

export type HttpForm = HttpValueMap;

export enum HttpResponseType {
  Text = 'text',
  Buffer = 'buffer',
  Json = 'json', // eslint-disable-line @typescript-eslint/no-shadow
  Stream = 'stream'
}

export type HttpResponseTypeValueType<T extends HttpResponseType> =
  T extends HttpResponseType.Text ? string
  : T extends HttpResponseType.Buffer ? ArrayBuffer
  : T extends HttpResponseType.Json ? Json
  : Readable;

export type HttpResponse<T extends HttpResponseType = HttpResponseType> = {
  request: HttpRequest,
  statusCode: number,
  statusMessage?: string,
  header: HttpHeaders,
  body: HttpResponseTypeValueType<T>
};

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'trace';

export interface HttpClientAdapter {
  call<T extends HttpResponseType>(request: HttpRequest): Promise<HttpResponse<T>>;
  callStream(request: HttpRequest): Promise<HttpResponse<HttpResponseType.Stream>>;
}

export type HttpClientHandler = AsyncMiddlerwareHandler<HttpRequest, HttpResponse>;

export type HttpClientMiddleware = AsyncMiddleware<HttpRequest, HttpResponse>;

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

  async head<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.call('head', url, responseType, options);
  }

  async get<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.call('get', url, responseType, options);
  }

  async getString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await this.call('get', url, HttpResponseType.Text, options);
    return response.body;
  }

  async getJson<T extends UndefinableJson>(url: string, options?: HttpRequestOptions): Promise<T> {
    const response = await this.call('get', url, HttpResponseType.Json, options);
    return response.body as T;
  }

  async getBuffer(url: string, options?: HttpRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('get', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  async getStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await this.callStream('get', url, options);
    return response.body;
  }

  async post<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.call('post', url, responseType, options);
  }

  async postString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await this.call('post', url, HttpResponseType.Text, options);
    return response.body;
  }

  async postJson<T extends UndefinableJson>(url: string, options?: HttpRequestOptions): Promise<T> {
    const response = await this.call('post', url, HttpResponseType.Json, options);
    return response.body as T;
  }

  async postBuffer(url: string, options?: HttpRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('post', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  async postStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await this.callStream('post', url, options);
    return response.body;
  }

  async put<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.call('put', url, responseType, options);
  }

  async putString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await this.call('put', url, HttpResponseType.Text, options);
    return response.body;
  }

  async putJson<T extends UndefinableJson>(url: string, options?: HttpRequestOptions): Promise<T> {
    const response = await this.call('put', url, HttpResponseType.Json, options);
    return response.body as T;
  }

  async putBuffer(url: string, options?: HttpRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('put', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  async putStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await this.callStream('put', url, options);
    return response.body;
  }

  async patch<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.call('patch', url, responseType, options);
  }

  async patchString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await this.call('patch', url, HttpResponseType.Text, options);
    return response.body;
  }

  async patchJson<T extends UndefinableJson>(url: string, options?: HttpRequestOptions): Promise<T> {
    const response = await this.call('patch', url, HttpResponseType.Json, options);
    return response.body as T;
  }

  async patchBuffer(url: string, options?: HttpRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('patch', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  async patchStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await this.callStream('patch', url, options);
    return response.body;
  }

  async delete<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.call('delete', url, responseType, options);
  }

  async deleteString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await this.call('delete', url, HttpResponseType.Text, options);
    return response.body;
  }

  async deleteJson<T extends UndefinableJson>(url: string, options?: HttpRequestOptions): Promise<T> {
    const response = await this.call('delete', url, HttpResponseType.Json, options);
    return response.body as T;
  }

  async deleteBuffer(url: string, options?: HttpRequestOptions): Promise<ArrayBuffer> {
    const response = await this.call('delete', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  async deleteStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await this.callStream('delete', url, options);
    return response.body;
  }

  private updateHandlers(): void {
    this.callHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (options) => this.adapter.call(options));
    this.callStreamHandler = composeAsyncMiddleware([...this.middleware, ...this.internalMiddleware], async (options) => this.adapter.callStream(options));
  }

  private async call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const request: HttpRequest = { url, method, responseType, ...options };
    const preparedRequest = this.prepareRequest(request);

    return this.callHandler(preparedRequest);
  }

  private async callStream(method: HttpMethod, url: string, options: HttpRequestOptions = {}): Promise<HttpResponse<HttpResponseType.Stream>> {
    const request: HttpRequest = { url, method, responseType: HttpResponseType.Stream, ...options };
    const preparedRequest = this.prepareRequest(request);

    return this.callStreamHandler(preparedRequest);
  }

  private prepareRequest(request: HttpRequest): HttpRequest {
    const headers = filterAndMergeHttpValueContainers(this.headers, request.headers);
    const parameters = filterAndMergeHttpValueContainers(request.parameters);
    const body = isDefined(request.body?.form) ? { ...request.body, form: filterAndMergeHttpValueContainers(request.body?.form) } : request.body;

    const preparedRequest: HttpRequest = { ...request, headers, parameters, body };
    return preparedRequest;
  }
}

function getBuildRequestUrlMiddleware(baseUrl: string | undefined): HttpClientMiddleware {
  async function buildUrlParametersMiddleware(request: HttpRequest, next: HttpClientHandler): Promise<HttpResponse> {
    const modifiedRequest = buildRequestUrl(request, baseUrl);
    return next(modifiedRequest);
  }

  return buildUrlParametersMiddleware;
}

function buildRequestUrl(request: HttpRequest, baseUrl?: string): HttpRequest {
  let url: URL;
  let modifiedRequest: HttpRequest = request;

  if (request.mapUrlParameters == false) {
    url = new URL(modifiedRequest.url, baseUrl);
  }
  else {
    const { parsedUrl, parametersRest } = buildUrl(modifiedRequest.url, modifiedRequest.parameters);

    url = new URL(parsedUrl, baseUrl);
    modifiedRequest = { ...modifiedRequest, parameters: parametersRest as HttpRequestOptions['parameters'] };
  }

  if (isDefined(modifiedRequest.parameters)) {
    for (const [key, valueOrValues] of Object.entries(modifiedRequest.parameters)) {
      for (const value of toArray(valueOrValues)) {
        if (isDefined(value)) {
          url.searchParams.append(key, value.toString());
        }
      }
    }

    modifiedRequest = { ...modifiedRequest, parameters: undefined };
  }

  if (isDefined(modifiedRequest.hash)) {
    url.hash = modifiedRequest.hash;
  }

  return { ...modifiedRequest, url: url.href };
}

function filterAndMergeHttpValueContainers(...items: (HttpValueMap | Iterable<HttpValueEntry> | undefined)[]): HttpValueMap | undefined {
  const filteredEntries = items.filter(isDefined)
    .flatMap((value) => (isIterable(value) ? (isArray(value) ? (value as HttpValueEntry[]) : [...value]) : Object.entries(value)))
    .map(([key, value]) => (isArray(value) ? [key, value.filter(isDefined)] as const : [key, value] as const))
    .filter(([, value]) => (isArray(value) ? value.length > 0 : isDefined(value)));

  if (filteredEntries.length == 0) {
    return undefined;
  }

  return Object.fromEntries(filteredEntries) as HttpValueMap;
}
