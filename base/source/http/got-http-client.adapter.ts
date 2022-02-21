import { container, singleton } from '#/container';
import { toArray } from '#/utils/array';
import { isArrayBuffer, isDefined, isUndefined } from '#/utils/type-guards';
import type * as Got from 'got';
import type { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { DeferredPromise } from '../promise';
import { HttpClientAdapter } from './client.adapter';
import { HttpError, HttpErrorReason } from './http.error';
import type { HttpBody, HttpBodyType, HttpClientResponse, NormalizedHttpClientRequest, NormalizedHttpHeaders } from './types';
import { abortToken } from './types';

let _got: typeof Got | undefined;

async function getGot(): Promise<typeof Got> {
  if (isUndefined(_got)) {
    _got = await (eval('import(\'got\')') as Promise<typeof Got>); // eslint-disable-line no-eval, require-atomic-updates
  }

  return _got;
}

@singleton()
export class GotHttpClientAdapter extends HttpClientAdapter {
  async call<T extends HttpBodyType>(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>> {
    const got = await getGot();

    switch (request.responseType) {
      case 'stream':
        return this.callStream(request) as Promise<HttpClientResponse<T>>;

      default:
        return this._call(got, request);
    }
  }

  async callStream(request: NormalizedHttpClientRequest): Promise<HttpClientResponse<'stream'>> {
    const got = await getGot();

    const gotOptions = getGotOptions(got, true, request);

    const responsePromise = new DeferredPromise<IncomingMessage>();
    const gotRequest = got.got.stream(request.url, { ...gotOptions });

    request[abortToken].set$.subscribe(() => gotRequest.destroy());

    gotRequest.on('response', (response: IncomingMessage) => responsePromise.resolve(response));
    gotRequest.on('error', (error) => responsePromise.reject(error));

    try {
      const response = await responsePromise;

      const result: HttpClientResponse<'stream'> = {
        request,
        statusCode: response.statusCode ?? -1,
        statusMessage: response.statusMessage,
        header: response.headers as NormalizedHttpHeaders,
        body: streamWrapper(got, gotRequest, request)
      };

      return result;
    }
    catch (error: unknown) {
      throw convertError(got, error, request);
    }
  }

  private async _call<T extends HttpBodyType>(got: typeof Got, request: NormalizedHttpClientRequest): Promise<HttpClientResponse<T>> {
    try {
      const gotOptions = getGotOptions(got, false, request);
      const gotRequest = got.got(request.url, { ...gotOptions, responseType: httpBodyTypeToGotResponseType(request.responseType) });

      request[abortToken].set$.subscribe(() => gotRequest.cancel());

      const response = await gotRequest;
      const result: HttpClientResponse<T> = {
        request,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        header: response.headers as NormalizedHttpHeaders,
        body: response.body as HttpBody<T>
      };

      return result;
    }
    catch (error: unknown) {
      throw convertError(got, error, request);
    }
  }
}

function convertError(got: typeof Got, error: unknown, request: NormalizedHttpClientRequest): HttpError {
  if (error instanceof got.HTTPError) {
    return new HttpError(HttpErrorReason.Unknown, request, convertResponse(request, error.response), error);
  }

  if (error instanceof got.CancelError) {
    return new HttpError(HttpErrorReason.Cancelled, request, convertResponse(request, error.response), error);
  }

  if (error instanceof got.TimeoutError) {
    return new HttpError(HttpErrorReason.Timeout, request, convertResponse(request, error.response), error);
  }

  return new HttpError(HttpErrorReason.Unknown, request, undefined, error as Error);
}

function convertResponse(request: NormalizedHttpClientRequest, gotResponse: Got.Response | undefined): HttpClientResponse | undefined {
  if (isUndefined(gotResponse)) {
    return undefined;
  }

  const response: HttpClientResponse = {
    request,
    statusCode: gotResponse.statusCode,
    statusMessage: gotResponse.statusMessage,
    header: gotResponse.headers as NormalizedHttpHeaders,
    body: gotResponse.body as HttpBody
  };

  return response;
}

// eslint-disable-next-line max-statements, max-lines-per-function
function getGotOptions(got: typeof Got, isStream: boolean, { method, headers, body, responseType, timeout }: NormalizedHttpClientRequest): Got.Options {
  const optionsInit: Got.OptionsInit = {
    isStream,
    retry: { limit: 0, methods: [] },
    followRedirect: true,
    method
  };

  const options = new got.Options(optionsInit);

  if (isDefined(headers)) {
    options.headers = headers;
  }

  const gotResponseType = httpBodyTypeToGotResponseType(responseType);

  if (isDefined(gotResponseType)) {
    options.responseType = gotResponseType;
  }

  options.timeout = { request: timeout };

  if (isDefined(body)) {
    const binary = body.buffer ?? body.stream;

    if (isDefined(body.json)) {
      options.body = JSON.stringify(body.json);
    }
    else if (isDefined(binary)) {
      options.body = isArrayBuffer(binary) ? Buffer.from(binary) : Readable.from(binary);
    }
    else if (isDefined(body.text)) {
      options.body = body.text;
    }
    else if (isDefined(body.form)) {
      const paras = new URLSearchParams();

      for (const [key, valueOrValues] of Object.entries(body.form)) {
        const values = toArray(valueOrValues).filter(isDefined);

        for (const value of values) {
          paras.append(key, value.toString());
        }
      }

      options.headers = { 'Content-Type': 'application/x-www-form-urlencoded', ...options.headers }; // eslint-disable-line @typescript-eslint/naming-convention
      options.body = paras.toString();
    }
  }

  return options;
}

function httpBodyTypeToGotResponseType(bodyType: HttpBodyType): Got.ResponseType | undefined {
  switch (bodyType) {
    case 'json':
      return 'json';

    case 'text':
      return 'text';

    case 'buffer':
      return 'buffer';

    default:
      return undefined;
  }
}

/**
 * @param register whether to register for {@link HttpClientAdapter}
 */
export function configureGotHttpClientAdapter(register: boolean): void {
  if (register) {
    container.register(HttpClientAdapter, { useToken: GotHttpClientAdapter });
  }
}

async function* streamWrapper(got: typeof Got, gotRequest: Got.Request, httpRequest: NormalizedHttpClientRequest): AsyncIterable<Uint8Array> {
  try {
    yield* gotRequest;
  }
  catch (error) {
    throw convertError(got, error, httpRequest);
  }
}
