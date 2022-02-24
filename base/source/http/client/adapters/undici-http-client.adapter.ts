import { container, singleton } from '#/container';
import { HttpError, HttpErrorReason, HttpHeaders } from '#/http';
import type { HttpStreamBodyType } from '#/http/types';
import { isDefined } from '#/utils/type-guards';
import type { IncomingHttpHeaders } from 'http';
import type { Dispatcher } from 'undici';
import { errors as undiciErrors, FormData, request } from 'undici';
import type { DispatchOptions } from 'undici/types/dispatcher';
import type { HttpClientRequest } from '../http-client-request';
import { HttpClientResponse } from '../http-client-response';
import { HttpClientAdapter } from '../http-client.adapter';

@singleton()
export class UndiciHttpClientAdapter extends HttpClientAdapter {
  // eslint-disable-next-line max-lines-per-function
  async call(httpClientRequest: HttpClientRequest): Promise<HttpClientResponse> {
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
      const formData = new FormData();

      for (const [key, entry] of httpClientRequest.body!.form) {
        formData.set(key, entry);
      }

      body = formData as unknown as DispatchOptions['body'];
    }

    try {
      const response = await request(httpClientRequest.url, {
        method: httpClientRequest.method.toUpperCase() as Dispatcher.HttpMethod,
        signal: httpClientRequest.abortToken.asAbortSignal,
        headers: httpClientRequest.headers.asNormalizedObject() as IncomingHttpHeaders,
        body,
        headersTimeout: httpClientRequest.timeout,
        bodyTimeout: httpClientRequest.timeout
      });

      const httpClientResponse = new HttpClientResponse<HttpStreamBodyType>(
        httpClientRequest,
        response.statusCode,
        '?',
        new HttpHeaders(response.headers),
        response.body,
        () => response.body.destroy()
      );

      if ((response.statusCode >= 400 && response.statusCode <= 500)) {
        throw new HttpError(HttpErrorReason.ErrorResponse, httpClientRequest, httpClientResponse, `status code ${response.statusCode}`);
      }

      return httpClientResponse;
    }
    catch (error) {
      if (error instanceof undiciErrors.UndiciError) {
        const reason
          = ((error instanceof undiciErrors.BodyTimeoutError) || (error instanceof undiciErrors.HeadersTimeoutError) || (error instanceof undiciErrors.SocketTimeoutError)) ? HttpErrorReason.Timeout
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
export function configureUndiciHttpClientAdapter(register: boolean): void {
  if (register) {
    container.register(HttpClientAdapter, { useToken: UndiciHttpClientAdapter });
  }
}
