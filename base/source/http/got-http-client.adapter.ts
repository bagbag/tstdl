import { singleton } from '#/container';
import { toArray } from '#/utils/array';
import { isArrayBuffer, isDefined, isUndefined } from '#/utils/type-guards';
import type { CancelableRequest, Options as GotOptions, Response, ResponseType } from 'got';
import Got, { CancelError, HTTPError, TimeoutError } from 'got';
import type { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { DeferredPromise } from '../promise';
import { HttpClientAdapter } from './client.adapter';
import { HttpError, HttpErrorReason } from './http.error';
import type { HttpBody, HttpBodyType, HttpClientResponse, NormalizedHttpClientRequest, NormalizedHttpHeaders } from './types';
import { abortToken } from './types';

const defaultGotOptions: GotOptions = {
  retry: 0,
  followRedirect: true
};

@singleton()
export class GotHttpClientAdapter extends HttpClientAdapter {
  async call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>> {
    switch (request.responseType) {
      case 'stream':
        return this.callStream(request) as Promise<HttpClientResponse<T>>;

      default:
        return this._call(request);
    }
  }

  async callStream(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<'stream'>> {
    const gotOptions = getGotOptions(request);

    const responsePromise = new DeferredPromise<IncomingMessage>();
    const gotRequest = Got.stream({ ...gotOptions, isStream: true });
    const originalOnResponse = gotRequest._onResponse.bind(gotRequest);

    request[abortToken].set$.subscribe(() => gotRequest.destroy());

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
      throw convertError(error, request);
    }
  }

  private async _call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>> {
    try {
      const gotOptions = getGotOptions(request);
      const gotRequest = Got({ ...gotOptions, responseType: httpBodyTypeToGotResponseType(request.responseType) }) as CancelableRequest;

      request[abortToken].set$.subscribe(() => gotRequest.cancel());

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
      throw convertError(error, request);
    }
  }
}

function convertError(error: unknown, request: NormalizedHttpClientRequest): HttpError {
  if (error instanceof HTTPError) {
    return new HttpError(HttpErrorReason.Unknown, request, convertResponse(request, error.response), error);
  }

  if (error instanceof CancelError) {
    return new HttpError(HttpErrorReason.Cancelled, request, convertResponse(request, error.response), error);
  }

  if (error instanceof TimeoutError) {
    return new HttpError(HttpErrorReason.Timeout, request, convertResponse(request, error.response), error);
  }

  return new HttpError(HttpErrorReason.Unknown, request, undefined, error as Error);
}

function convertResponse(request: NormalizedHttpClientRequest, gotResponse: Response | undefined): HttpClientResponse | undefined {
  if (isUndefined(gotResponse)) {
    return undefined;
  }

  const response: HttpClientResponse = {
    request,
    statusCode: gotResponse.statusCode,
    statusMessage: gotResponse.statusMessage,
    header: gotResponse.headers as NormalizedHttpHeaders,
    body: gotResponse.body as HttpBody
  };

  return response;
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