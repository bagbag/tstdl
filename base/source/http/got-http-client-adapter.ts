import type { Options as GotOptions, Response } from 'got';
import Got, { HTTPError } from 'got';
import type { IncomingMessage } from 'http';
import * as QueryString from 'querystring';
import { DeferredPromise } from '../promise';
import type { StringMap } from '../types';
import { isArrayBuffer, isDefined } from '../utils';
import type { HttpClientAdapter, HttpMethod, HttpRequestOptions, HttpResponse, HttpResponseTypeValueType } from './client';
import { HttpResponseType } from './client';
import { HttpError } from './http.error';

const defaultGotOptions: GotOptions = {
  retry: 0,
  followRedirect: true
};

export class GotHttpClientAdapter implements HttpClientAdapter {
  async call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
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

    switch (responseType) {
      case HttpResponseType.Stream:
        return this.callStream(method, url, { ...options, headers }) as Promise<HttpResponse<T>>;

      default:
        return this._call(method, url, responseType, { ...options, headers });
    }
  }

  async callStream(method: HttpMethod, url: string, options?: HttpRequestOptions): Promise<HttpResponse<HttpResponseType.Stream>> {
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

  private async _call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
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

        throw new HttpError(url, method, options, response, error);
      }

      throw error;
    }
  }
}

function getGotOptions(method: HttpMethod, { headers, body, timeout }: HttpRequestOptions = {}): GotOptions {
  const options: GotOptions = {
    ...defaultGotOptions,
    method,
    headers,
    timeout
  };

  if (isDefined(body)) {
    const binary = body.buffer ?? body.readable ?? body.text;

    if (isDefined(binary)) {
      options.body = isArrayBuffer(binary) ? Buffer.from(binary) : binary;
    }
    else if (isDefined(body.json)) {
      options.body = JSON.stringify(body.json);
    }
    else if (isDefined(body.form)) {
      options.body = QueryString.stringify(body.form);
    }
  }

  return options;
}
