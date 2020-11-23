import { DeferredPromise } from '@tstdl/base/promise';
import type { Json, StringMap } from '@tstdl/base/types';
import Got from 'got';
import type { Options as GotOptions, Response } from 'got';
import type { IncomingMessage } from 'http';
import * as QueryString from 'querystring';
import type { Readable } from 'stream';

export type HttpRequestOptions = {
  headers?: StringMap<string | string[]>,
  body?: {
    form?: StringMap<string>,
    json?: Json,
    text?: string,
    buffer?: Buffer,
    readable?: Readable
  },
  timeout?: number
};

export enum HttpResponseType {
  Text = 'text',
  Buffer = 'buffer',
  Json = 'json',
  Stream = 'stream'
}

export type HttpResponseTypeValueType<T extends HttpResponseType> =
  T extends HttpResponseType.Text ? string
  : T extends HttpResponseType.Buffer ? Buffer
  : T extends HttpResponseType.Json ? Json
  : Readable;

export type HttpResponse<T extends HttpResponseType> = {
  statusCode: number,
  statusMessage: string,
  header: StringMap<string | string[]>,
  body: HttpResponseTypeValueType<T>
};

const defaultGotOptions: GotOptions = {
  retry: 0,
  followRedirect: true
};

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'trace';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpClient {
  static async get<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return HttpClient.call('get', url, responseType, options);
  }

  static async getString(url: string, options: HttpRequestOptions = {}): Promise<string> {
    const headers = { Accept: 'text/plain', ...options.headers };
    const response = await HttpClient.call('get', url, HttpResponseType.Text, { ...options, headers });
    return response.body;
  }

  static async getJson(url: string, options: HttpRequestOptions = {}): Promise<Json> {
    const headers = { Accept: 'application/json', ...options.headers };
    const response = await HttpClient.call('get', url, HttpResponseType.Json, { ...options, headers });
    return response.body;
  }

  static async getBuffer(url: string, options?: HttpRequestOptions): Promise<Buffer> {
    const response = await HttpClient.call('get', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  static async getStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await HttpClient.callStream('get', url, options);
    return response.body;
  }

  static async post<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return HttpClient.call('post', url, responseType, options);
  }

  static async postString(url: string, options: HttpRequestOptions = {}): Promise<string> {
    const headers = { Accept: 'text/plain', ...options.headers };
    const response = await HttpClient.call('post', url, HttpResponseType.Text, { ...options, headers });
    return response.body;
  }

  static async postJson(url: string, options: HttpRequestOptions = {}): Promise<Json> {
    const headers = { Accept: 'application/json', ...options.headers };
    const response = await HttpClient.call('post', url, HttpResponseType.Json, { ...options, headers });
    return response.body;
  }

  static async postBuffer(url: string, options?: HttpRequestOptions): Promise<Buffer> {
    const response = await HttpClient.call('post', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  static async postStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await HttpClient.callStream('post', url, options);
    return response.body;
  }

  static async call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    switch (responseType) {
      case HttpResponseType.Stream:
        return this.callStream(method, url, options) as Promise<HttpResponse<T>>;

      default:
        return this._call(method, url, responseType, options);
    }
  }

  static async callStream(method: HttpMethod, url: string, options?: HttpRequestOptions): Promise<HttpResponse<HttpResponseType.Stream>> {
    const gotOptions = getGotOptions(method, options);

    const responsePromise = new DeferredPromise<IncomingMessage>();
    const request = Got.stream(url, { ...gotOptions, isStream: true });
    const originalOnResponse = request._onResponse.bind(request);

    async function onResponseWrapper(response: IncomingMessage): Promise<void> {
      if (!responsePromise.resolved) {
        responsePromise.resolve(response);
      }

      return originalOnResponse(response);
    }

    request._onResponse = onResponseWrapper;

    const response = await responsePromise;

    const result: HttpResponse<HttpResponseType.Stream> = {
      statusCode: response.statusCode as number,
      statusMessage: response.statusMessage ?? '',
      header: response.headers as StringMap<string | string[]>,
      body: request
    };

    return result;
  }

  private static async _call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    const gotOptions = getGotOptions(method, options);
    const request = Got(url, { ...gotOptions, responseType: responseType as any });
    const response = await request as Response;
    const result: HttpResponse<T> = {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage ?? '',
      header: response.headers as StringMap<string | string[]>,
      body: response.body as HttpResponseTypeValueType<T>
    };

    return result;
  }
}

function getGotOptions(method: HttpMethod, { headers, body, timeout }: HttpRequestOptions = {}): GotOptions {
  const options: GotOptions = {
    ...defaultGotOptions,
    method,
    headers,
    timeout
  };


  if (body != undefined) {
    const binary = body.buffer ?? body.readable ?? body.text;

    if (binary != undefined) {
      options.body = binary;
    }
    else if (body.json != undefined) {
      options.body = JSON.stringify(body.json);
    }
    else if (body.form != undefined) {
      options.body = QueryString.stringify(body.form);
    }
  }

  return options;
}

function getResponseSymbol(obj: object): symbol {
  const symbol = Object.getOwnPropertySymbols(obj).find((symbol) => symbol.description == 'response');

  if (symbol == undefined) {
    throw new Error('response symbol not found');
  }

  return symbol;
}
