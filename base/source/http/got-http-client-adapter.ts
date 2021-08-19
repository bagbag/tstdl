import type { Options as GotOptions, Response, ResponseType } from 'got';
import Got, { HTTPError } from 'got';
import type { IncomingMessage } from 'http';
import { DeferredPromise } from '../promise';
import type { StringMap } from '../types';
import { isArray, isArrayBuffer, isDefined } from '../utils';
import type { HttpClientAdapter, HttpRequest, HttpResponse, HttpResponseTypeValueType } from './client';
import { HttpResponseType } from './client';
import { HttpError } from './http.error';

const defaultGotOptions: GotOptions = {
  retry: 0,
  followRedirect: true
};

export class GotHttpClientAdapter implements HttpClientAdapter {
  async call<T extends HttpResponseType>(request: HttpRequest): Promise<HttpResponse<T>> {
    const baseHeaders: StringMap<string | string[]> = {};

    if (request.responseType == HttpResponseType.Text) {
      baseHeaders['Accept'] = 'text/plain';
    }
    else if (request.responseType == HttpResponseType.Json) {
      baseHeaders['Accept'] = 'application/json';
    }

    if (isDefined(request.body?.text)) {
      baseHeaders['Content-Type'] = 'text/plain';
    }
    else if (isDefined(request.body?.json)) {
      baseHeaders['Content-Type'] = 'application/json';
    }
    else if (isDefined(request.body?.form)) {
      baseHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    else if (isDefined(request.body?.readable) || isDefined(request.body?.buffer)) {
      baseHeaders['Content-Type'] = 'application/octet-stream';
    }

    const headers = { ...baseHeaders, ...request.headers };

    switch (request.responseType) {
      case HttpResponseType.Stream:
        return this.callStream({ ...request, headers }) as Promise<HttpResponse<T>>;

      default:
        return this._call({ ...request, headers });
    }
  }

  async callStream(request: HttpRequest): Promise<HttpResponse<HttpResponseType.Stream>> {
    const gotOptions = getGotOptions(request);

    const responsePromise = new DeferredPromise<IncomingMessage>();
    const gotRequest = Got.stream({ ...gotOptions, isStream: true });
    const originalOnResponse = gotRequest._onResponse.bind(gotRequest);

    async function onResponseWrapper(response: IncomingMessage): Promise<void> {
      if (!responsePromise.resolved) {
        responsePromise.resolve(response);
      }

      return originalOnResponse(response);
    }

    gotRequest._onResponse = onResponseWrapper;

    try {
      const response = await responsePromise;

      const result: HttpResponse<HttpResponseType.Stream> = {
        request,
        statusCode: response.statusCode ?? -1,
        statusMessage: response.statusMessage,
        header: response.headers as StringMap<string | string[]>,
        body: gotRequest
      };

      return result;
    }
    catch (error: unknown) {
      if (error instanceof HTTPError) {
        const response: HttpResponse<any> = {
          request,
          statusCode: error.response.statusCode,
          statusMessage: error.response.statusMessage,
          header: error.response.headers as StringMap<string | string[]>,
          body: error.response.body as HttpResponseTypeValueType<any>
        };

        throw new HttpError(request, response);
      }

      throw new HttpError(request, undefined, error as Error);
    }
  }

  private async _call<T extends HttpResponseType>(request: HttpRequest): Promise<HttpResponse<T>> {
    try {
      const gotOptions = getGotOptions(request);
      const gotRequest = Got({ ...gotOptions, responseType: request.responseType as ResponseType });
      const response = await gotRequest as Response;
      const result: HttpResponse<T> = {
        request,
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
          request,
          statusCode: error.response.statusCode,
          statusMessage: error.response.statusMessage,
          header: error.response.headers as StringMap<string | string[]>,
          body: error.response.body as HttpResponseTypeValueType<any>
        };

        throw new HttpError(request, response, error);
      }

      throw new HttpError(request, undefined, error as Error);
    }
  }
}

function getGotOptions({ url, method, headers, body, timeout }: HttpRequest): GotOptions {
  const options: GotOptions = {
    ...defaultGotOptions,
    url,
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
      const paras = new URLSearchParams();

      for (const [key, valueOrValues] of Object.entries(body.form)) {
        if (isArray(valueOrValues)) {
          // eslint-disable-next-line max-depth
          for (const value of valueOrValues) {
            paras.append(key, value);
          }
        }
        else {
          paras.append(key, valueOrValues);
        }
      }

      options.body = paras.toString();
    }
  }

  return options;
}
