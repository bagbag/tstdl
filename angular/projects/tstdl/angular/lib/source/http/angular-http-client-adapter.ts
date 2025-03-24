import { HttpClient as AngularHttpClient, HttpErrorResponse as AngularHttpErrorResponse, HttpHeaders as AngularHttpHeaders, HttpEventType } from '@angular/common/http';
import { Injector as AngularInjector, inject } from '@angular/core';
import type { ApiClientHttpRequestContext } from '@tstdl/base/api';
import { HttpClientAdapter, HttpClientResponse, HttpError, HttpErrorReason, HttpHeaders } from '@tstdl/base/http';
import type { HttpClientRequest } from '@tstdl/base/http/client';
import { Singleton, Injector as TstdlInjector } from '@tstdl/base/injector';
import type { StringMap } from '@tstdl/base/types';
import { isBlob, isDefined, isReadableStream, isUint8Array, isUndefined } from '@tstdl/base/utils';
import { toArray } from '@tstdl/base/utils/array';
import { hasOwnProperty } from '@tstdl/base/utils/object';
import { firstValueFrom, race, switchMap, throwError } from 'rxjs';

const aborted = Symbol('aborted');

@Singleton()
export class AngularHttpClientAdapter implements HttpClientAdapter {
  private readonly angularHttpClient = inject(AngularHttpClient);

  async call(request: HttpClientRequest): Promise<HttpClientResponse> {
    try {
      const angularResponse = await firstValueFrom(
        race(
          this.angularHttpClient.request(request.method, request.url, {
            headers: new AngularHttpHeaders(request.headers.asNormalizedObject() as StringMap<string | string[]>),
            responseType: 'blob',
            observe: 'response',
            body: getAngularBody(request.body),
            withCredentials: (request.credentials == 'same-origin') || (request.credentials == 'include')
          }),
          request.abortSignal.set$.pipe(switchMap(() => throwError(() => aborted)))
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

      if (!(error instanceof AngularHttpErrorResponse)) {
        throw new HttpError(HttpErrorReason.Unknown, request, undefined, undefined, error as Error);
      }

      const response = new HttpClientResponse({
        request,
        statusCode: error.status,
        statusMessage: error.statusText,
        headers: convertAngularHeaders(error.headers),
        body: (error.error instanceof ProgressEvent) ? undefined : error.error,
        closeHandler: () => request.abort()
      });

      if ((error.type == HttpEventType.Response) && (error.status > 0)) {
        return response;
      }

      const reason = getHttpErrorReason(error);
      const httpError = await HttpError.create(reason, request, response, error);
      throw httpError;
    }
  }
}

function getHttpErrorReason(error: AngularHttpErrorResponse): HttpErrorReason {
  const statusText = error.statusText.toLowerCase();

  if (statusText.includes('timeout')) {
    return HttpErrorReason.Timeout;
  }

  return HttpErrorReason.Unknown;
}

function convertAngularHeaders(headers: AngularHttpHeaders): HttpHeaders {
  const headersObject = Object.fromEntries(headers.keys().map((name) => [name, headers.getAll(name)!] as const).map(([name, values]) => [name, values.length > 1 ? values : values[0]!] as const));
  return new HttpHeaders(headersObject);
}

function getAngularBody(body: HttpClientRequest['body']): any {
  if (isUndefined(body)) {
    return null;
  }

  if (isDefined(body.json)) {
    return JSON.stringify(body.json);
  }

  if (isDefined(body.text)) {
    return body.text;
  }

  if (isDefined(body.binary)) {
    if (isBlob(body.binary)) {
      return body.binary;
    }

    if (isUint8Array(body.binary)) {
      return new Blob([body.binary]);
    }

    if (isReadableStream(body.binary)) {
      throw new Error('AngularHttpClientAdapter does not support streams. Use buffer instead.');
    }
  }

  if (isDefined(body.form)) {
    const params = new URLSearchParams();

    for (const [key, entry] of body.form.normalizedEntries()) {
      for (const value of toArray(entry)) {
        params.append(key, value);
      }
    }

    return params.toString();
  }

  if (isDefined(body.formData)) {
    return body.formData;
  }

  throw new Error('Unsupported body.');
}

function isApiClientHttpRequestContext(context: HttpClientRequest['context']): context is ApiClientHttpRequestContext {
  return hasOwnProperty(context, 'endpoint');
}

export function configureAngularHttpClientAdapter(): void {
  TstdlInjector.register(HttpClientAdapter, { useToken: AngularHttpClientAdapter });
  TstdlInjector.register(AngularHttpClient, { useFactory: (_, context) => context.resolve(AngularInjector).get(AngularHttpClient) });
}
