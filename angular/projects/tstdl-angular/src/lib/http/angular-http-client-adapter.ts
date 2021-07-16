import type { HttpClient as AngularHttpClient, HttpRequest as AngularHttpRequest, HttpResponse as AngularHttpResponse } from '@angular/common/http';
import { HttpErrorResponse as AngularHttpErrorResponse, HttpHeaders as AngularHttpHeaders, HttpParams as AngularHttpParams } from '@angular/common/http';
import type { HttpClientAdapter, HttpMethod, HttpRequestOptions, HttpResponse, HttpResponseTypeValueType } from '@tstdl/base/http';
import { HttpError, HttpResponseType } from '@tstdl/base/http';
import type { StringMap } from '@tstdl/base/types';
import { isDefined, isUndefined } from '@tstdl/base/utils';
import { firstValueFrom } from 'rxjs';

export class AngularHttpClientAdapter implements HttpClientAdapter {
  private readonly angularHttpClient: AngularHttpClient;

  constructor(angularHttpClient: AngularHttpClient) {
    this.angularHttpClient = angularHttpClient;
  }

  async call<T extends HttpResponseType>(method: HttpMethod, url: string, responseType: T, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await firstValueFrom<AngularHttpResponse<HttpResponseTypeValueType<T>>>(this.angularHttpClient.request(method.toUpperCase(), url, {
        headers: new AngularHttpHeaders(options.headers),
        params: new AngularHttpParams(options.parameters),
        responseType: getAngularHttpRequestResponseType(responseType),
        observe: 'response',
        body: getAngularBody(options.body)
      }));

      const header = convertAngularHeaders(response.headers);

      const result: HttpResponse<T> = {
        statusCode: response.status,
        statusMessage: response.statusText,
        header,
        body: response.body!
      };

      return result;
    }
    catch (error: unknown) {
      if (error instanceof AngularHttpErrorResponse) {
        const response: HttpResponse<any> = {
          statusCode: error.status,
          statusMessage: error.statusText,
          header: convertAngularHeaders(error.headers),
          body: null
        };

        throw new HttpError(url, method, options, response, error);
      }

      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async callStream(_method: HttpMethod, _url: string, _options?: HttpRequestOptions): Promise<HttpResponse<HttpResponseType.Stream>> {
    throw new Error('Method not implemented.');
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

    for (const [key, value] of Object.entries(body.form)) {
      if (Array.isArray(value)) {
        for (const _value of value) {
          formData.append(key, _value);
        }
      }
      else {
        formData.set(key, value);
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
