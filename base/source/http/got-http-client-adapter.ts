import type { Options as GotOptions, Response, ResponseType } from 'got';
import Got, { HTTPError, TimeoutError } from 'got';
import type { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { DeferredPromise } from '../promise';
import { isArrayBuffer, isDefined, toArray } from '../utils';
import type { HttpClientAdapter } from './client';
import { HttpError, HttpErrorReason } from './http.error';
import type { HttpBody, HttpBodyType, HttpClientResponse, NormalizedHttpClientRequest, NormalizedHttpHeaders } from './types';

const defaultGotOptions: GotOptions = {
  retry: 0,
  followRedirect: true
};

export class GotHttpClientAdapter implements HttpClientAdapter {
  async call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>> {
    switch (request.responseType) {
      case 'stream':
        return this.callStream({ ...request, headers: request.headers }) as Promise<HttpClientResponse<T>>;

      default:
        return this._call({ ...request, headers: request.headers });
    }
  }

  async callStream(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<'stream'>> {
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

      const result: HttpClientResponse<'stream'> = {
        request,
        statusCode: response.statusCode ?? -1,
        statusMessage: response.statusMessage,
        header: response.headers as NormalizedHttpHeaders,
        body: gotRequest
      };

      return result;
    }
    catch (error: unknown) {
      if (error instanceof HTTPError) {
        const response: HttpClientResponse = {
          request,
          statusCode: error.response.statusCode,
          statusMessage: error.response.statusMessage,
          header: error.response.headers as NormalizedHttpHeaders,
          body: error.response.body as HttpBody
        };

        throw new HttpError(HttpErrorReason.Unknown, request, response);
      }

      if (error instanceof TimeoutError) {
        throw new HttpError(HttpErrorReason.Timeout, request, undefined, error);
      }

      throw new HttpError(HttpErrorReason.Unknown, request, undefined, error as Error);
    }
  }

  private async _call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>> {
    try {
      const gotOptions = getGotOptions(request);
      const gotRequest = Got({ ...gotOptions, responseType: httpBodyTypeToGotResponseType(request.responseType) });
      const response = await gotRequest as Response;
      const result: HttpClientResponse<T> = {
        request,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        header: response.headers as NormalizedHttpHeaders,
        body: response.body as HttpBody<T>
      };

      return result;
    }
    catch (error: unknown) {
      if (error instanceof HTTPError) {
        const response: HttpClientResponse = {
          request,
          statusCode: error.response.statusCode,
          statusMessage: error.response.statusMessage,
          header: error.response.headers as NormalizedHttpHeaders,
          body: error.response.body as HttpBody
        };

        throw new HttpError(HttpErrorReason.Unknown, request, response, error);
      }

      if (error instanceof TimeoutError) {
        throw new HttpError(HttpErrorReason.Timeout, request, undefined, error);
      }

      throw new HttpError(HttpErrorReason.Unknown, request, undefined, error as Error);
    }
  }
}

function getGotOptions({ url, method, headers, body, responseType, timeout }: NormalizedHttpClientRequest): GotOptions {
  const options: GotOptions = {
    ...defaultGotOptions,
    url,
    method,
    headers,
    responseType: httpBodyTypeToGotResponseType(responseType),
    timeout
  };

  if (isDefined(body)) {
    const binary = body.buffer ?? body.stream;

    if (isDefined(binary)) {
      options.body = isArrayBuffer(binary) ? Buffer.from(binary) : Readable.from(binary);
    }
    else if (isDefined(body.text)) {
      options.body = body.text;
    }
    else if (isDefined(body.json)) {
      options.body = JSON.stringify(body.json);
    }
    else if (isDefined(body.form)) {
      const paras = new URLSearchParams();

      for (const [key, valueOrValues] of Object.entries(body.form)) {
        const values = toArray(valueOrValues).filter(isDefined);

        for (const value of values) {
          paras.append(key, value.toString());
        }
      }

      options.body = paras.toString();
    }
  }

  return options;
}

function httpBodyTypeToGotResponseType(bodyType: HttpBodyType): ResponseType | undefined {
  switch (bodyType) {
    case 'json':
      return 'json';

    case 'text':
      return 'text';

    case 'buffer':
      return 'buffer';

    default:
      return undefined;
  }
}
