import type { HttpRequest as AngularHttpRequest, HttpResponse as AngularHttpResponse } from '@angular/common/http';
import { HttpClient as AngularHttpClient, HttpErrorResponse as AngularHttpErrorResponse, HttpHeaders as AngularHttpHeaders } from '@angular/common/http';
import { container, singleton } from '@tstdl/base/container';
import type { HttpBody, HttpBodyType, HttpClientResponse, NormalizedHttpClientRequest } from '@tstdl/base/http';
import { abortToken, HttpError, HttpErrorReason } from '@tstdl/base/http';
import { HttpClientAdapter } from '@tstdl/base/http/client.adapter';
import { firstValueFrom } from '@tstdl/base/rxjs/compat';
import type { StringMap } from '@tstdl/base/types';
import { isDefined, isUndefined } from '@tstdl/base/utils';
import { toArray } from '@tstdl/base/utils/array';
import type { Observable } from 'rxjs';
import { race, switchMapTo, throwError } from 'rxjs';

const aborted = Symbol('aborted');

@singleton()
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

/**
 * @param register whether to register for {@link HttpClientAdapter}
 */
export function configureAngularHttpClientAdapter(register: boolean): void {
  if (register) {
    container.register(HttpClientAdapter, { useToken: AngularHttpClientAdapter });
  }
}
