import type { HttpClient as AngularHttpClient, HttpRequest as AngularHttpRequest, HttpResponse as AngularHttpResponse } from '@angular/common/http';
import { HttpErrorResponse as AngularHttpErrorResponse, HttpHeaders as AngularHttpHeaders, HttpParams as AngularHttpParams } from '@angular/common/http';
import type { HttpClientAdapter, HttpRequest, HttpRequestOptions, HttpResponse, HttpResponseTypeValueType } from '@tstdl/base/cjs/http';
import { HttpError, HttpResponseType } from '@tstdl/base/cjs/http';
import { firstValueFrom } from '@tstdl/base/cjs/rxjs/compat';
import type { StringMap } from '@tstdl/base/cjs/types';
import { isDefined, isUndefined, toArray } from '@tstdl/base/cjs/utils';

export class AngularHttpClientAdapter implements HttpClientAdapter {
  private readonly angularHttpClient: AngularHttpClient;

  constructor(angularHttpClient: AngularHttpClient) {
    this.angularHttpClient = angularHttpClient;
  }

  async call<T extends HttpResponseType>(request: HttpRequest): Promise<HttpResponse<T>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const angularResponse = await firstValueFrom<AngularHttpResponse<HttpResponseTypeValueType<T>>>(this.angularHttpClient.request(request.method, request.url, {
        headers: new AngularHttpHeaders(request.headers as StringMap),
        params: new AngularHttpParams({ fromObject: request.parameters as StringMap }),
        responseType: getAngularHttpRequestResponseType(request.responseType),
        observe: 'response',
        body: getAngularBody(request.body)
      }));

      const header = convertAngularHeaders(angularResponse.headers);

      const response: HttpResponse<T> = {
        request,
        statusCode: angularResponse.status,
        statusMessage: angularResponse.statusText,
        header,
        body: angularResponse.body!
      };

      return response;
    }
    catch (error: unknown) {
      if (error instanceof AngularHttpErrorResponse) {
        const response: HttpResponse<any> = {
          request,
          statusCode: error.status,
          statusMessage: error.statusText,
          header: convertAngularHeaders(error.headers),
          body: null
        };

        throw new HttpError(request, response, error);
      }

      throw new HttpError(request, undefined, error as Error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async callStream(_request?: HttpRequest): Promise<HttpResponse<HttpResponseType.Stream>> {
    throw new Error('streams not supported by AngularHttpClientAdapter');
  }
}

function convertAngularHeaders(headers: AngularHttpHeaders): StringMap<string | string[]> {
  return Object.fromEntries(headers.keys().map((name) => [name, headers.getAll(name)!] as const).map(([name, values]) => [name, values.length > 1 ? values : values[0]!] as const));
}

function getAngularBody(body: HttpRequestOptions['body']): any {
  if (isUndefined(body)) {
    return null;
  }

  const binary = body.buffer ?? body.readable ?? body.text;

  if (isDefined(binary)) {
    return binary;
  }
  else if (isDefined(body.json)) {
    return body.json;
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

function getAngularHttpRequestResponseType(responseType: HttpResponseType): AngularHttpRequest<any>['responseType'] {
  switch (responseType) {
    case HttpResponseType.Buffer:
      return 'arraybuffer';

    case HttpResponseType.Json:
      return 'json';

    case HttpResponseType.Text:
      return 'text';

    default:
      throw new Error(`HttpResponseType "${responseType}" not supported`);
  }
}
