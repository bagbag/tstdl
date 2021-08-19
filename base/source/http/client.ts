import type { Readable } from 'stream';
import type { Json, StringMap, UndefinableJson } from '../types';
import { buildUrl, isDefined, isUndefined } from '../utils';

export const httpRequestMeta = Symbol('HttpRequestMeta');

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
  [httpRequestMeta]?: Record<any, unknown>
};

export type HttpRequest = { url: string, method: HttpMethod, responseType: HttpResponseType } & HttpRequestOptions;

export type HttpHeaders = StringMap<string | string[]>;

export type HttpParameters = StringMap<string | string[]>;

export type HttpForm = StringMap<string | string[]>;

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

export type HttpClientHandler = (request: HttpRequest) => Promise<HttpResponse>;

export type HttpClientMiddleware = (request: HttpRequest, next: HttpClientHandler) => HttpResponse | Promise<HttpResponse>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpClient {
  private static _instance?: HttpClient;

  private readonly adapter: HttpClientAdapter;
  private readonly headers: Map<string, string | string[]>;
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

  setDefaultHeader(name: string, value: string | string[]): void {
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
    this.callHandler = this.composeMiddleware([...this.middleware, ...this.internalMiddleware], async (options) => this.adapter.call(options));
    this.callStreamHandler = this.composeMiddleware([...this.middleware, ...this.internalMiddleware], async (options) => this.adapter.callStream(options));
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

  private composeMiddleware(middlewares: HttpClientMiddleware[], handler: HttpClientHandler): HttpClientHandler {
    let currentIndex = -1;

    async function dispatch(index: number, request: HttpRequest): Promise<HttpResponse> {
      if (index == middlewares.length) {
        return handler(request);
      }

      const middleware = middlewares[index]!;
      currentIndex = index;

      async function next(nextRequest: HttpRequest): Promise<HttpResponse> {
        if (index < currentIndex) {
          throw new Error('next() called multiple times');
        }

        return dispatch(index + 1, nextRequest);
      }

      return middleware(request, next);
    }

    return async (request: HttpRequest) => dispatch(0, request);
  }

  private prepareRequest(request: HttpRequest): HttpRequest {
    return addHeaders(request, Object.fromEntries(this.headers));
  }
}

function addHeaders(request: HttpRequest, headers: HttpHeaders): HttpRequest {
  const modifiedRequest = { ...request, headers: { ...headers, ...request.headers } };
  return modifiedRequest;
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
  let modifiedOptions: HttpRequest = request;

  if (request.mapUrlParameters == false) {
    url = new URL(modifiedOptions.url, baseUrl);
  }
  else {
    const { parsedUrl, parametersRest } = buildUrl(modifiedOptions.url, request.parameters);

    url = new URL(parsedUrl, baseUrl);
    modifiedOptions = { ...request, parameters: parametersRest as HttpRequestOptions['parameters'] };
  }

  if (isDefined(modifiedOptions.parameters)) {
    for (const [key, valueOrValues] of Object.entries(modifiedOptions.parameters)) {
      if (Array.isArray(valueOrValues)) {
        for (const value of valueOrValues) {
          url.searchParams.append(key, value);
        }
      }
      else {
        url.searchParams.append(key, valueOrValues);
      }
    }
  }

  if (isDefined(request.hash)) {
    url.hash = request.hash;
  }

  return { ...modifiedOptions, url: url.href };
}
