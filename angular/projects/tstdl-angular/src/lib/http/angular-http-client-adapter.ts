import type { HttpRequest as AngularHttpRequest, HttpResponse as AngularHttpResponse } from '@angular/common/http';
import { HttpClient as AngularHttpClient, HttpErrorResponse as AngularHttpErrorResponse, HttpHeaders as AngularHttpHeaders } from '@angular/common/http';
import { Injector } from '@angular/core';
import { container, singleton } from '@tstdl/base/container';
import type { HttpBody, HttpBodyType, HttpClientRequest } from '@tstdl/base/http';
import { HttpClientResponse, HttpError, HttpErrorReason, HttpHeaders } from '@tstdl/base/http';
import { HttpClientAdapter } from '@tstdl/base/http/client/http-client.adapter';
import { firstValueFrom } from '@tstdl/base/rxjs/compat';
import type { StringMap } from '@tstdl/base/types';
import { toArray } from '@tstdl/base/utils/array';
import { isArrayBuffer, isDefined, isUndefined } from '@tstdl/base/utils/type-guards';
import type { Observable } from 'rxjs';
import { race, switchMap, throwError } from 'rxjs';

const aborted = Symbol('aborted');

@singleton()
export class AngularHttpClientAdapter implements HttpClientAdapter {
  private readonly angularHttpClient: AngularHttpClient;

  constructor(angularHttpClient: AngularHttpClient) {
    this.angularHttpClient = angularHttpClient;
  }

  // eslint-disable-next-line max-lines-per-function
  async call<T extends HttpBodyType>(request: HttpClientRequest<T>): Promise<HttpClientResponse<T>> {
    if (request.responseType == 'stream') {
      throw new Error('streams are not (yet) supported by AngularHttpClientAdapter');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const angularResponse = await firstValueFrom(
        race(
          this.angularHttpClient.request(request.method, request.url, {
            headers: new AngularHttpHeaders(request.headers.asNormalizedObject() as StringMap<string | string[]>),
            responseType: getAngularHttpRequestResponseType(request.responseType),
            observe: 'response',
            body: getAngularBody(request.body),
            withCredentials: (request.credentials == 'same-origin') || (request.credentials == 'include')
          }) as Observable<AngularHttpResponse<HttpBody<T>>>,
          request.abortToken.set$.pipe(switchMap(() => throwError(() => aborted)))
        )
      );

      const headers = convertAngularHeaders(angularResponse.headers);

      const body = (isArrayBuffer(angularResponse.body) ? new Uint8Array(angularResponse.body) : (angularResponse.body ?? undefined)) as HttpBody<T>;

      const response = new HttpClientResponse<T>({
        request,
        statusCode: angularResponse.status,
        statusMessage: angularResponse.statusText,
        headers,
        body,
        closeHandler: () => request.abort()
      });

      return response;
    }
    catch (error: unknown) {
      if (error == aborted) {
        throw new HttpError(HttpErrorReason.Cancelled, request);
      }

      if (error instanceof AngularHttpErrorResponse) {
        const response = new HttpClientResponse({
          request,
          statusCode: error.status,
          statusMessage: error.statusText,
          headers: convertAngularHeaders(error.headers),
          body: error.error,
          closeHandler: () => request.abort()
        });

        throw new HttpError(HttpErrorReason.InvalidRequest, request, response, error);
      }

      throw new HttpError(HttpErrorReason.Unknown, request, undefined, error as Error);
    }
  }
}

function convertAngularHeaders(headers: AngularHttpHeaders): HttpHeaders {
  const headersObject = Object.fromEntries(headers.keys().map((name) => [name, headers.getAll(name)!] as const).map(([name, values]) => [name, values.length > 1 ? values : values[0]!] as const));
  return new HttpHeaders(headersObject);
}

function getAngularBody(body: HttpClientRequest['body']): any {
  if (isUndefined(body)) {
    return null;
  }

  else if (isDefined(body.json)) {
    return JSON.stringify(body.json);
  }
  else if (isDefined(body.text)) {
    return body.text;
  }
  if (isDefined(body.buffer)) {
    return new Blob([body.buffer]);
  }
  if (isDefined(body.stream)) {
    throw new Error('AngularHttpClientAdapter does not support streams. Use buffer instead');
  }
  else if (isDefined(body.form)) {
    const formData = new FormData();

    for (const [key, valueOrValues] of body.form.normalizedEntries()) {
      for (const value of toArray(valueOrValues)) {
        if (isDefined(value)) {
          formData.append(key, value.toString());
        }
      }
    }

    return formData;
  }

  throw new Error('unsupported body');
}

function getAngularHttpRequestResponseType(responseType: HttpBodyType): AngularHttpRequest<any>['responseType'] {
  switch (responseType) {
    case 'buffer':
      return 'arraybuffer';

    case 'json':
      return 'json';

    case 'text':
      return 'text';

    default:
      throw new Error(`HttpResponseType "${responseType}" not supported`);
  }
}

/**
 * @param register whether to register for {@link HttpClientAdapter}
 */
export function configureAngularHttpClientAdapter(register: boolean): void {
  if (register) {
    container.register(HttpClientAdapter, { useToken: AngularHttpClientAdapter });
    container.register(AngularHttpClient, { useFactory: (_, context) => context.resolve(Injector).get(AngularHttpClient) }, { metadata: { skipAngularInjection: true } });
  }
}
