import { container, injectArg, singleton } from '#/container';
import type { HttpBodyType } from '#/http';
import { HttpError, HttpErrorReason, HttpHeaders } from '#/http';
import type { HttpBody } from '#/http/types';
import { toArray } from '#/utils/array';
import { isDefined } from '#/utils/type-guards';
import type { IncomingHttpHeaders } from 'http';
import type { Readable } from 'stream';
import type { Dispatcher } from 'undici';
import { errors as undiciErrors, request } from 'undici';
import type { DispatchOptions } from 'undici/types/dispatcher';
import type { HttpClientRequest } from '../http-client-request';
import { HttpClientResponse } from '../http-client-response';
import { HttpClientAdapter } from '../http-client.adapter';
import { setBody } from './utils';

export type UndiciHttpClientAdapterOptions = {
  dispatcher?: Dispatcher
};

let defaultOptions: UndiciHttpClientAdapterOptions = {};

@singleton({ defaultArgumentProvider: () => defaultOptions })
export class UndiciHttpClientAdapter extends HttpClientAdapter {
  private readonly options: UndiciHttpClientAdapterOptions;

  constructor(@injectArg() options: UndiciHttpClientAdapterOptions) {
    super();

    this.options = options;
  }

  // eslint-disable-next-line max-lines-per-function, max-statements
  async call<T extends HttpBodyType>(httpClientRequest: HttpClientRequest<T>): Promise<HttpClientResponse<T>> {
    let body: DispatchOptions['body'];

    if (isDefined(httpClientRequest.body?.json)) {
      body = JSON.stringify(httpClientRequest.body!.json);
    }
    else if (isDefined(httpClientRequest.body?.buffer)) {
      body = httpClientRequest.body!.buffer;
    }
    else if (isDefined(httpClientRequest.body?.text)) {
      body = httpClientRequest.body!.text;
    }
    else if (isDefined(httpClientRequest.body?.stream)) {
      body = httpClientRequest.body!.stream as unknown as DispatchOptions['body'];
    }
    else if (isDefined(httpClientRequest.body?.form)) {
      const searchParams = new URLSearchParams();

      for (const [key, entry] of httpClientRequest.body!.form.normalizedEntries()) {
        for (const value of toArray(entry)) {
          searchParams.append(key, value);
        }
      }

      body = searchParams.toString();
    }

    try {
      const response = await request(httpClientRequest.url, {
        method: httpClientRequest.method,
        signal: httpClientRequest.abortToken.asAbortSignal,
        headers: httpClientRequest.headers.asNormalizedObject() as IncomingHttpHeaders,
        body,
        headersTimeout: httpClientRequest.timeout,
        bodyTimeout: httpClientRequest.timeout,
        dispatcher: this.options.dispatcher
      });

      const httpClientResponse = new HttpClientResponse<T>({
        request: httpClientRequest,
        statusCode: response.statusCode,
        statusMessage: '?',
        headers: new HttpHeaders(response.headers),
        body: response.body as unknown as HttpBody<T>,
        closeHandler: () => (response.body as Readable).destroy()
      });

      await setBody(httpClientResponse, httpClientRequest.responseType);

      if ((response.statusCode >= 400 && response.statusCode <= 500)) {
        throw new HttpError(HttpErrorReason.ErrorResponse, httpClientRequest, httpClientResponse, `status code ${response.statusCode}`);
      }

      return httpClientResponse;
    }
    catch (error) {
      if (error instanceof undiciErrors.UndiciError) {
        const reason
          = ((error instanceof undiciErrors.BodyTimeoutError) || (error instanceof undiciErrors.HeadersTimeoutError)) ? HttpErrorReason.Timeout
            : (error instanceof undiciErrors.RequestAbortedError) ? HttpErrorReason.Cancelled
              : HttpErrorReason.Unknown;

        throw new HttpError(reason, httpClientRequest, undefined, error);
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
