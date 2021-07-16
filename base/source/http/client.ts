import type { Readable } from 'stream';
import type { Json, StringMap, UndefinableJson } from '../types';
import { buildUrl, isDefined, isUndefined } from '../utils';

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
  timeout?: number
};

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

export type HttpResponse<T extends HttpResponseType> = {
  statusCode: number,
  statusMessage?: string,
  header: HttpHeaders,
  body: HttpResponseTypeValueType<T>
};

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'trace';

export interface HttpClientAdapter {
  call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  callStream(method: HttpMethod, url: string, options?: HttpRequestOptions): Promise<HttpResponse<HttpResponseType.Stream>>;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpClient {
  private static _instance?: HttpClient;

  private readonly adapter: HttpClientAdapter;
  private readonly headers: Map<string, string | string[]>;

  static get instance(): HttpClient {
    if (isUndefined(this._instance)) {
      throw new Error('global instance not configured');
    }

    return this._instance;
  }

  constructor(adapter: HttpClientAdapter) {
    this.adapter = adapter;

    this.headers = new Map();
  }

  static configureGlobalInstance(adapter: HttpClientAdapter): void {
    this._instance = new HttpClient(adapter);
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

  private async call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const { uri, newOptions } = this.prepareRequest(url, options);
    return this.adapter.call(method, uri, responseType, newOptions);
  }

  private async callStream(method: HttpMethod, url: string, options: HttpRequestOptions = {}): Promise<HttpResponse<HttpResponseType.Stream>> {
    const { uri, newOptions } = this.prepareRequest(url, options);
    return this.adapter.callStream(method, uri, newOptions);
  }

  private prepareRequest(url: string, options: HttpRequestOptions): { uri: string, newOptions: HttpRequestOptions } {
    const optionsWithHeaders = this.addHeaders(options, Object.fromEntries(this.headers));
    return this.getUri(url, optionsWithHeaders);
  }

  private addHeaders(options: HttpRequestOptions, headers: HttpHeaders): HttpRequestOptions {
    const newOptions = { ...options, headers: { ...headers, ...options.headers } };
    return newOptions;
  }

  private getUri(url: string, options: HttpRequestOptions = {}): { uri: string, newOptions: HttpRequestOptions } {
    let uri: URL;
    let modifiedOptions: HttpRequestOptions = options;

    if (options.mapUrlParameters == false || isUndefined(options.parameters)) {
      uri = new URL(url);
    }
    else {
      const { parsedUrl, parametersRest } = buildUrl(url, options.parameters);

      uri = new URL(parsedUrl);
      modifiedOptions = { ...options, parameters: parametersRest as HttpRequestOptions['parameters'] };
    }

    if (isDefined(modifiedOptions.parameters)) {
      for (const [key, valueOrValues] of Object.entries(modifiedOptions.parameters)) {
        if (Array.isArray(valueOrValues)) {
          for (const value of valueOrValues) {
            uri.searchParams.append(key, value);
          }
        }
        else {
          uri.searchParams.append(key, valueOrValues);
        }
      }
    }

    if (isDefined(options.hash)) {
      uri.hash = options.hash;
    }

    return { uri: uri.href, newOptions: modifiedOptions };
  }
}
