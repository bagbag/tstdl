import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

import type { Dispatcher, FormData } from 'undici';
import { request, errors as undiciErrors } from 'undici';

import { HttpHeaders } from '#/http/http-headers.js';
import { HttpError, HttpErrorReason } from '#/http/http.error.js';
import type { Resolvable } from '#/injector/index.js';
import { Singleton, injectArgument, resolveArgumentType } from '#/injector/index.js';
import { Injector } from '#/injector/injector.js';
import { toArray } from '#/utils/array/array.js';
import { isBlob, isDefined, isUint8Array } from '#/utils/type-guards.js';
import type { HttpClientRequest } from '../http-client-request.js';
import { HttpClientResponse } from '../http-client-response.js';
import { HttpClientAdapter } from '../http-client.adapter.js';

export type UndiciHttpClientAdapterOptions = {
  dispatcher?: Dispatcher
};

let defaultOptions: UndiciHttpClientAdapterOptions = {};

@Singleton({ defaultArgumentProvider: () => defaultOptions })
export class UndiciHttpClientAdapter extends HttpClientAdapter implements Resolvable<UndiciHttpClientAdapterOptions> {
  private readonly options = injectArgument(this);

  declare readonly [resolveArgumentType]: UndiciHttpClientAdapterOptions;

  // eslint-disable-next-line max-lines-per-function, max-statements
  async call(httpClientRequest: HttpClientRequest): Promise<HttpClientResponse> {
    let body: Dispatcher.DispatchOptions['body'];

    if (isDefined(httpClientRequest.body?.json)) {
      body = JSON.stringify(httpClientRequest.body.json);
    }
    else if (isDefined(httpClientRequest.body?.text)) {
      body = httpClientRequest.body.text;
    }
    else if (isDefined(httpClientRequest.body?.binary)) {
      if (isBlob(httpClientRequest.body.binary)) {
        body = Readable.from(httpClientRequest.body.binary.stream() as ReadableStream);
      }
      else {
        body = isUint8Array(httpClientRequest.body.binary)
          ? httpClientRequest.body.binary
          : Readable.from(httpClientRequest.body.binary as ReadableStream);
      }
    }
    else if (isDefined(httpClientRequest.body?.form)) {
      const params = new URLSearchParams();

      for (const [key, entry] of httpClientRequest.body.form.normalizedEntries()) {
        for (const value of toArray(entry)) {
          params.append(key, value);
        }
      }

      body = params.toString();
    }
    else if (isDefined(httpClientRequest.body?.formData)) {
      body = httpClientRequest.body.formData as FormData;
    }

    try {
      const response = await request(httpClientRequest.url, {
        method: httpClientRequest.method,
        signal: httpClientRequest.abortSignal.asAbortSignal(),
        headers: httpClientRequest.headers.asNormalizedObject(),
        body,
        headersTimeout: httpClientRequest.timeout,
        bodyTimeout: httpClientRequest.timeout,
        dispatcher: this.options.dispatcher,
      });

      const httpClientResponse = new HttpClientResponse({
        request: httpClientRequest,
        statusCode: response.statusCode,
        statusMessage: '?',
        headers: new HttpHeaders(response.headers),
        body: response.body,
        closeHandler: () => response.body.destroy(),
      });

      return httpClientResponse;
    }
    catch (error) {
      if (error instanceof undiciErrors.UndiciError) {
        const reason = getHttpErrorReason(error);
        throw new HttpError(reason, httpClientRequest, { cause: error });
      }

      throw error;
    }
  }
}

/**
 * @param register whether to register for {@link HttpClientAdapter}
 */
export function configureUndiciHttpClientAdapter(options: UndiciHttpClientAdapterOptions & { register?: boolean } = {}): void {
  defaultOptions = options;

  if (options.register ?? true) {
    Injector.register(HttpClientAdapter, { useToken: UndiciHttpClientAdapter });
  }
}

function getHttpErrorReason(error: undiciErrors.UndiciError): HttpErrorReason {
  switch (error.code) {
    case 'UND_ERR_CONNECT_TIMEOUT':
    case 'UND_ERR_HEADERS_TIMEOUT':
    case 'UND_ERR_BODY_TIMEOUT':
      return HttpErrorReason.Timeout;

    case 'UND_ERR_RESPONSE_STATUS_CODE':
      return HttpErrorReason.StatusCode;

    case 'UND_ERR_HEADERS_OVERFLOW':
    case 'UND_ERR_RES_CONTENT_LENGTH_MISMATCH':
      return HttpErrorReason.ResponseError;

    case 'UND_ERR_REQ_CONTENT_LENGTH_MISMATCH':
    case 'UND_ERR_INVALID_ARG':
    case 'UND_ERR_INVALID_RETURN_VALUE':
      return HttpErrorReason.InvalidRequest;

    case 'UND_ERR_ABORTED':
    case 'UND_ERR_DESTROYED':
    case 'UND_ERR_CLOSED':
      return HttpErrorReason.Cancelled;

    case 'UND_ERR_SOCKET':
      return HttpErrorReason.Network;

    case 'UND_ERR_INFO':
    case 'UND_ERR_NOT_SUPPORTED':
    case 'UND_ERR_BPL_MISSING_UPSTREAM':
    case 'UND_ERR_RES_EXCEEDED_MAX_SIZE':
    default:
      return HttpErrorReason.Unknown;
  }
}
