import { container, injectArg, singleton } from '#/container/index.js';
import { HttpHeaders } from '#/http/http-headers.js';
import { HttpError, HttpErrorReason } from '#/http/http.error.js';
import { toArray } from '#/utils/array/array.js';
import { isDefined } from '#/utils/type-guards.js';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import type { Dispatcher } from 'undici';
import { request, errors as undiciErrors } from 'undici';
import type { HttpClientRequest } from '../http-client-request.js';
import { HttpClientResponse } from '../http-client-response.js';
import { HttpClientAdapter } from '../http-client.adapter.js';

export type UndiciHttpClientAdapterOptions = {
  dispatcher?: Dispatcher
};

let defaultOptions: UndiciHttpClientAdapterOptions = {};

@singleton({ defaultArgumentProvider: () => defaultOptions })
export class UndiciHttpClientAdapter extends HttpClientAdapter {
  private readonly options: UndiciHttpClientAdapterOptions;

  constructor(@injectArg() options: UndiciHttpClientAdapterOptions = {}) {
    super();

    this.options = options;
  }

  // eslint-disable-next-line max-lines-per-function, max-statements
  async call(httpClientRequest: HttpClientRequest): Promise<HttpClientResponse> {
    let body: Dispatcher.DispatchOptions['body'];

    if (isDefined(httpClientRequest.body?.json)) {
      body = JSON.stringify(httpClientRequest.body!.json);
    }
    else if (isDefined(httpClientRequest.body?.text)) {
      body = httpClientRequest.body!.text;
    }
    else if (isDefined(httpClientRequest.body?.buffer)) {
      body = httpClientRequest.body!.buffer;
    }
    else if (isDefined(httpClientRequest.body?.blob)) {
      body = Readable.from(httpClientRequest.body!.blob.stream() as ReadableStream);
    }
    else if (isDefined(httpClientRequest.body?.stream)) {
      body = Readable.from(httpClientRequest.body!.stream as ReadableStream);
    }
    else if (isDefined(httpClientRequest.body?.form)) {
      const params = new URLSearchParams();

      for (const [key, entry] of httpClientRequest.body!.form.normalizedEntries()) {
        for (const value of toArray(entry)) {
          params.append(key, value);
        }
      }

      body = params.toString();
    }

    try {
      const response = await request(httpClientRequest.url, {
        method: httpClientRequest.method,
        signal: httpClientRequest.abortToken.asAbortSignal(),
        headers: httpClientRequest.headers.asNormalizedObject(),
        body,
        headersTimeout: httpClientRequest.timeout,
        bodyTimeout: httpClientRequest.timeout,
        dispatcher: this.options.dispatcher
      });

      const httpClientResponse = new HttpClientResponse({
        request: httpClientRequest,
        statusCode: response.statusCode,
        statusMessage: '?',
        headers: new HttpHeaders(response.headers),
        body: response.body,
        closeHandler: () => response.body.destroy()
      });

      return httpClientResponse;
    }
    catch (error) {
      if (error instanceof undiciErrors.UndiciError) {
        const reason
          = ((error instanceof undiciErrors.BodyTimeoutError) || (error instanceof undiciErrors.HeadersTimeoutError)) ? HttpErrorReason.Timeout
            : (error instanceof undiciErrors.RequestAbortedError) ? HttpErrorReason.Cancelled
              : HttpErrorReason.Unknown;

        throw new HttpError(reason, httpClientRequest, undefined, undefined, error);
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
    container.register(HttpClientAdapter, { useToken: UndiciHttpClientAdapter });
  }
}
