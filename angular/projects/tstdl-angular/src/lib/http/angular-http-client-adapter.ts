import type { HttpClient as AngularHttpClient, HttpRequest as AngularHttpRequest, HttpResponse as AngularHttpResponse } from '@angular/common/http';
import { HttpErrorResponse as AngularHttpErrorResponse, HttpHeaders as AngularHttpHeaders } from '@angular/common/http';
import { abortToken, HttpBody, HttpBodyType, HttpClientAdapter, HttpClientResponse, HttpError, HttpErrorReason, NormalizedHttpClientRequest } from '@tstdl/base/cjs/http';
import { firstValueFrom } from '@tstdl/base/cjs/rxjs/compat';
import type { StringMap } from '@tstdl/base/cjs/types';
import { isDefined, isUndefined, toArray } from '@tstdl/base/cjs/utils';
import { Observable, race, switchMapTo, throwError } from 'rxjs';

const aborted = Symbol('aborted');

export class AngularHttpClientAdapter implements HttpClientAdapter {
  private readonly angularHttpClient: AngularHttpClient;

  constructor(angularHttpClient: AngularHttpClient) {
    this.angularHttpClient = angularHttpClient;
  }

  async call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const angularResponse = await firstValueFrom(
        race(
          this.angularHttpClient.request(request.method, request.url, {
            headers: new AngularHttpHeaders(request.headers),
            responseType: getAngularHttpRequestResponseType(request.responseType),
            observe: 'response',
            body: getAngularBody(request.body)
          }) as Observable<AngularHttpResponse<HttpBody<T>>>,
          request[abortToken].set$.pipe(switchMapTo(throwError(() => aborted)))
        )
      );

      const header = convertAngularHeaders(angularResponse.headers);

      const response: HttpClientResponse<T> = {
        request,
        statusCode: angularResponse.status,
        statusMessage: angularResponse.statusText,
        header,
        body: (angularResponse.body ?? undefined) as HttpBody<T>
      };

      return response;
    }
    catch (error: unknown) {
      if (error == aborted) {
        throw new HttpError(HttpErrorReason.Cancelled, request);
      }

      if (error instanceof AngularHttpErrorResponse) {
        const response: HttpClientResponse = {
          request,
          statusCode: error.status,
          statusMessage: error.statusText,
          header: convertAngularHeaders(error.headers),
          body: error.error
        };

        throw new HttpError(HttpErrorReason.InvalidRequest, request, response, error);
      }

      throw new HttpError(HttpErrorReason.Unknown, request, undefined, error as Error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async callStream(_request?: NormalizedHttpClientRequest): Promise<HttpClientResponse<'stream'>> {
    throw new Error('streams not (yet) supported by AngularHttpClientAdapter');
  }
}

function convertAngularHeaders(headers: AngularHttpHeaders): StringMap<string | string[]> {
  return Object.fromEntries(headers.keys().map((name) => [name, headers.getAll(name)!] as const).map(([name, values]) => [name, values.length > 1 ? values : values[0]!] as const));
}

function getAngularBody(body: NormalizedHttpClientRequest['body']): any {
  if (isUndefined(body)) {
    return null;
  }

  else if (isDefined(body.json)) {
    return body.json;
  }
  else if (isDefined(body.text)) {
    return body.text;
  }
  if (isDefined(body.buffer)) {
    return body.buffer;
  }
  if (isDefined(body.stream)) {
    return body.stream;
  }
  else if (isDefined(body.form)) {
    const formData = new FormData();

    for (const [key, valueOrValues] of Object.entries(body.form)) {
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
