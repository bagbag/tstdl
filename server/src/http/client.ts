import { DeferredPromise } from '@tstdl/base/promise';
import type { Json, StringMap } from '@tstdl/base/types';
import { isDefined } from '@tstdl/base/utils';
import { HTTPError, Options as GotOptions, Response } from 'got';
import Got from 'got';
import type { IncomingMessage } from 'http';
import * as QueryString from 'querystring';
import type { Readable } from 'stream';
import { HttpError } from './http.error';

export type HttpRequestOptions = {
  headers?: StringMap<string | string[]>,
  parameters?: StringMap<string | string[]>,
  hash?: string,
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
  statusMessage?: string,
  header: StringMap<string | string[]>,
  body: HttpResponseTypeValueType<T>
};

const defaultGotOptions: GotOptions = {
  retry: 0,
  followRedirect: true
};

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'trace';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpClient {
  static async head<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return HttpClient.call('head', url, responseType, options);
  }

  static async get<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return HttpClient.call('get', url, responseType, options);
  }

  static async getString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await HttpClient.call('get', url, HttpResponseType.Text, options);
    return response.body;
  }

  static async getJson(url: string, options?: HttpRequestOptions): Promise<Json> {
    const response = await HttpClient.call('get', url, HttpResponseType.Json, options);
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

  static async postString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await HttpClient.call('post', url, HttpResponseType.Text, options);
    return response.body;
  }

  static async postJson(url: string, options?: HttpRequestOptions): Promise<Json> {
    const response = await HttpClient.call('post', url, HttpResponseType.Json, options);
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

  static async put<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return HttpClient.call('put', url, responseType, options);
  }

  static async putString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await HttpClient.call('put', url, HttpResponseType.Text, options);
    return response.body;
  }

  static async putJson(url: string, options?: HttpRequestOptions): Promise<Json> {
    const response = await HttpClient.call('put', url, HttpResponseType.Json, options);
    return response.body;
  }

  static async putBuffer(url: string, options?: HttpRequestOptions): Promise<Buffer> {
    const response = await HttpClient.call('put', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  static async putStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await HttpClient.callStream('put', url, options);
    return response.body;
  }

  static async patch<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return HttpClient.call('patch', url, responseType, options);
  }

  static async patchString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await HttpClient.call('patch', url, HttpResponseType.Text, options);
    return response.body;
  }

  static async patchJson(url: string, options?: HttpRequestOptions): Promise<Json> {
    const response = await HttpClient.call('patch', url, HttpResponseType.Json, options);
    return response.body;
  }

  static async patchBuffer(url: string, options?: HttpRequestOptions): Promise<Buffer> {
    const response = await HttpClient.call('patch', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  static async patchStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await HttpClient.callStream('patch', url, options);
    return response.body;
  }

  static async delete<T extends HttpResponseType>(url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return HttpClient.call('delete', url, responseType, options);
  }

  static async deleteString(url: string, options?: HttpRequestOptions): Promise<string> {
    const response = await HttpClient.call('delete', url, HttpResponseType.Text, options);
    return response.body;
  }

  static async deleteJson(url: string, options?: HttpRequestOptions): Promise<Json> {
    const response = await HttpClient.call('delete', url, HttpResponseType.Json, options);
    return response.body;
  }

  static async deleteBuffer(url: string, options?: HttpRequestOptions): Promise<Buffer> {
    const response = await HttpClient.call('delete', url, HttpResponseType.Buffer, options);
    return response.body;
  }

  static async deleteStream(url: string, options?: HttpRequestOptions): Promise<Readable> {
    const response = await HttpClient.callStream('delete', url, options);
    return response.body;
  }

  // eslint-disable-next-line max-lines-per-function
  static async call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const baseHeaders: StringMap<string | string[]> = {};

    if (responseType == HttpResponseType.Text) {
      baseHeaders['Accept'] = 'text/plain';
    }
    else if (responseType == HttpResponseType.Json) {
      baseHeaders['Accept'] = 'application/json';
    }

    if (isDefined(options.body?.text)) {
      baseHeaders['Content-Type'] = 'text/plain';
    }
    else if (isDefined(options.body?.json)) {
      baseHeaders['Content-Type'] = 'application/json';
    }
    else if (isDefined(options.body?.form)) {
      baseHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    else if (isDefined(options.body?.readable) || isDefined(options.body?.buffer)) {
      baseHeaders['Content-Type'] = 'application/octet-stream';
    }

    const headers = { ...baseHeaders, ...options.headers };
    const uri = getUri(url, options);

    switch (responseType) {
      case HttpResponseType.Stream:
        return this.callStream(method, uri, { ...options, headers }) as Promise<HttpResponse<T>>;

      default:
        return this._call(method, uri, responseType, { ...options, headers });
    }
  }

  static async callStream(method: HttpMethod, url: string, options?: HttpRequestOptions): Promise<HttpResponse<HttpResponseType.Stream>> {
    const uri = getUri(url, options);
    const gotOptions = getGotOptions(method, options);

    const responsePromise = new DeferredPromise<IncomingMessage>();
    const request = Got.stream(uri, { ...gotOptions, isStream: true });
    const originalOnResponse = request._onResponse.bind(request);

    async function onResponseWrapper(response: IncomingMessage): Promise<void> {
      if (!responsePromise.resolved) {
        responsePromise.resolve(response);
      }

      return originalOnResponse(response);
    }

    request._onResponse = onResponseWrapper;

    try {
      const response = await responsePromise;

      const result: HttpResponse<HttpResponseType.Stream> = {
        statusCode: response.statusCode ?? -1,
        statusMessage: response.statusMessage,
        header: response.headers as StringMap<string | string[]>,
        body: request
      };

      return result;
    }
    catch (error: unknown) {
      if (error instanceof HTTPError) {
        const response: HttpResponse<any> = {
          statusCode: error.response.statusCode,
          statusMessage: error.response.statusMessage,
          header: error.response.headers as StringMap<string | string[]>,
          body: error.response.body as HttpResponseTypeValueType<any>
        };

        throw new HttpError(url, method, options ?? {}, response);
      }

      throw error;
    }
  }

  private static async _call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    try {
      const gotOptions = getGotOptions(method, options);
      const request = Got(url, { ...gotOptions, responseType: responseType as any });
      const response = await request as Response;
      const result: HttpResponse<T> = {
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        header: response.headers as StringMap<string | string[]>,
        body: response.body as HttpResponseTypeValueType<T>
      };

      return result;
    }
    catch (error: unknown) {
      if (error instanceof HTTPError) {
        const response: HttpResponse<any> = {
          statusCode: error.response.statusCode,
          statusMessage: error.response.statusMessage,
          header: error.response.headers as StringMap<string | string[]>,
          body: error.response.body as HttpResponseTypeValueType<any>
        };

        throw new HttpError(url, method, options ?? {}, response);
      }

      throw error;
    }
  }
}

function getUri(url: string, options: HttpRequestOptions = {}): string {
  const uri = new URL(url);

  if (isDefined(options.parameters)) {
    for (const [key, valueOrValues] of Object.entries(options.parameters)) {
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

  return uri.href;
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
