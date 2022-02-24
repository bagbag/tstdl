import { container, singleton } from '#/container';
import { toArray } from '#/utils/array';
import { isArrayBuffer, isDefined, isUndefined } from '#/utils/type-guards';
import type * as Got from 'got';
import type { IncomingMessage } from 'http';
import { Readable } from 'stream';
import type { HttpClientRequest } from '..';
import { HttpClientResponse } from '..';
import { DeferredPromise } from '../../../promise';
import { HttpHeaders } from '../../http-headers';
import { HttpError, HttpErrorReason } from '../../http.error';
import { HttpClientAdapter } from '../http-client.adapter';

let _got: typeof Got | undefined;

async function getGot(): Promise<typeof Got> {
  if (isUndefined(_got)) {
    _got = await (eval('import(\'got\')') as Promise<typeof Got>); // eslint-disable-line no-eval, require-atomic-updates
  }

  return _got;
}

@singleton()
export class GotHttpClientAdapter extends HttpClientAdapter {
  async call(request: HttpClientRequest): Promise<HttpClientResponse> {
    return this.callStream(request);
  }

  async callStream(request: HttpClientRequest): Promise<HttpClientResponse> {
    const got = await getGot();

    const gotOptions = getGotOptions(got, true, request);

    const responsePromise = new DeferredPromise<IncomingMessage>();
    const gotRequest = got.got.stream(request.url, { ...gotOptions });

    request.abortToken.set$.subscribe(() => gotRequest.destroy());

    gotRequest.on('response', (response: IncomingMessage) => responsePromise.resolve(response));
    gotRequest.on('error', (error) => responsePromise.reject(error));

    try {
      const gotResponse = await responsePromise;

      return new HttpClientResponse(
        request,
        gotResponse.statusCode ?? -1,
        gotResponse.statusMessage ?? '',
        new HttpHeaders(gotResponse.headers),
        streamWrapper(got, gotRequest, request),
        () => gotRequest.destroy()
      );
    }
    catch (error: unknown) {
      throw convertError(got, error, request);
    }
  }
}

function convertError(got: typeof Got, error: unknown, request: HttpClientRequest): HttpError {
  if (error instanceof got.HTTPError) {
    return new HttpError(HttpErrorReason.Unknown, request, convertResponse(got, request, error.response), error);
  }

  if (error instanceof got.CancelError) {
    return new HttpError(HttpErrorReason.Cancelled, request, convertResponse(got, request, error.response), error);
  }

  if (error instanceof got.TimeoutError) {
    return new HttpError(HttpErrorReason.Timeout, request, convertResponse(got, request, error.response), error);
  }

  return new HttpError(HttpErrorReason.Unknown, request, undefined, error as Error);
}

function convertResponse(got: typeof Got, request: HttpClientRequest, gotResponse: Got.Response | undefined): HttpClientResponse | undefined {
  if (isUndefined(gotResponse)) {
    return undefined;
  }

  return new HttpClientResponse(
    request,
    gotResponse.statusCode,
    gotResponse.statusMessage ?? '',
    new HttpHeaders(gotResponse.headers),
    streamWrapper(got, gotResponse, request),
    () => gotResponse.destroy()
  );
}

// eslint-disable-next-line max-statements, max-lines-per-function
function getGotOptions(got: typeof Got, isStream: boolean, { method, headers, body, timeout }: HttpClientRequest): Got.Options {
  const optionsInit: Got.OptionsInit = {
    isStream,
    retry: { limit: 0, methods: [] },
    followRedirect: true,
    method
  };

  const options = new got.Options(optionsInit);

  if (isDefined(headers)) {
    options.headers = headers.asNormalizedObject() as Got.Headers;
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
      const searchParamerters = new URLSearchParams();

      for (const [key, valueOrValues] of body.form.normalizedEntries()) {
        const values = toArray(valueOrValues).filter(isDefined);

        for (const value of values) {
          searchParamerters.append(key, value);
        }
      }

      options.headers = { 'Content-Type': 'application/x-www-form-urlencoded', ...options.headers }; // eslint-disable-line @typescript-eslint/naming-convention
      options.body = searchParamerters.toString();
    }
  }

  return options;
}

/**
 * @param register whether to register for {@link HttpClientAdapter}
 */
export function configureGotHttpClientAdapter(register: boolean): void {
  if (register) {
    container.register(HttpClientAdapter, { useToken: GotHttpClientAdapter });
  }
}

async function* streamWrapper(got: typeof Got, readable: Got.Request | Got.Response, httpRequest: HttpClientRequest): AsyncIterable<Uint8Array> {
  try {
    yield* readable;
  }
  catch (error) {
    throw convertError(got, error, httpRequest);
  }
}
