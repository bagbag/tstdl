import { HttpClient as AngularHttpClient, HttpErrorResponse as AngularHttpErrorResponse, HttpHeaders as AngularHttpHeaders } from '@angular/common/http';
import { Injector } from '@angular/core';
import { HttpClientResponse, HttpError, HttpErrorReason, HttpHeaders } from '@tstdl/base/http';
import type { HttpClientRequest } from '@tstdl/base/http/client';
import { HttpClientAdapter } from '@tstdl/base/http/client/http-client.adapter';
import { Singleton, Injector as TstdlInjector } from '@tstdl/base/injector';
import type { StringMap } from '@tstdl/base/types';
import { toArray } from '@tstdl/base/utils/array';
import { isDefined, isUndefined } from '@tstdl/base/utils/type-guards';
import { firstValueFrom, race, switchMap, throwError } from 'rxjs';

const aborted = Symbol('aborted');

@Singleton()
export class AngularHttpClientAdapter implements HttpClientAdapter {
  private readonly angularHttpClient: AngularHttpClient;

  constructor(angularHttpClient: AngularHttpClient) {
    this.angularHttpClient = angularHttpClient;
  }

  // eslint-disable-next-line max-lines-per-function
  async call(request: HttpClientRequest): Promise<HttpClientResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const angularResponse = await firstValueFrom(
        race(
          this.angularHttpClient.request(request.method, request.url, {
            headers: new AngularHttpHeaders(request.headers.asNormalizedObject() as StringMap<string | string[]>),
            responseType: 'blob',
            observe: 'response',
            body: getAngularBody(request.body),
            withCredentials: (request.credentials == 'same-origin') || (request.credentials == 'include')
          }),
          request.abortToken.set$.pipe(switchMap(() => throwError(() => aborted)))
        )
      );

      const headers = convertAngularHeaders(angularResponse.headers);

      const response = new HttpClientResponse({
        request,
        statusCode: angularResponse.status,
        statusMessage: angularResponse.statusText,
        headers,
        body: angularResponse.body ?? undefined,
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
          body: (error.error instanceof ProgressEvent) ? undefined : error.error,
          closeHandler: () => request.abort()
        });

        const httpError = await HttpError.create(HttpErrorReason.InvalidRequest, request, response, error);
        throw httpError;
      }

      throw new HttpError(HttpErrorReason.Unknown, request, undefined, undefined, error as Error);
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
  if (isDefined(body.blob)) {
    return body.blob;
  }
  if (isDefined(body.stream)) {
    throw new Error('AngularHttpClientAdapter does not support streams. Use buffer instead.');
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

  throw new Error('Unsupported body.');
}

/**
 * @param register whether to register for {@link HttpClientAdapter}
 */
export function configureAngularHttpClientAdapter(register: boolean): void {
  if (register) {
    TstdlInjector.register(HttpClientAdapter, { useToken: AngularHttpClientAdapter });
    TstdlInjector.register(AngularHttpClient, { useFactory: (_, context) => context.resolve(Injector).get(AngularHttpClient) });
  }
}
