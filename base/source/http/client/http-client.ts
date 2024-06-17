import { hasErrorHandler, isErrorResponse, parseErrorResponse } from '#/api/response.js';
import { Singleton, inject, injectAll, injectArgument, resolveArgumentType } from '#/injector/index.js';
import type { Resolvable } from '#/injector/interfaces.js';
import type { OneOrMany, UndefinableJson } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { encodeBase64 } from '#/utils/base64.js';
import { encodeUtf8 } from '#/utils/encoding.js';
import { composeAsyncMiddleware } from '#/utils/middleware.js';
import { objectEntries } from '#/utils/object/object.js';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise.js';
import { assertDefined, isArray, isBlob, isDefined, isObject, isUndefined } from '#/utils/type-guards.js';
import { buildUrl } from '#/utils/url-builder.js';
import { HttpHeaders } from '../http-headers.js';
import { HttpError, HttpErrorReason } from '../http.error.js';
import type { HttpMethod, HttpValue } from '../types.js';
import { normalizeHttpValue, normalizeSingleHttpValue } from '../types.js';
import type { ReadBodyOptions } from '../utils.js';
import { HttpClientOptions } from './http-client-options.js';
import type { HttpClientRequestOptions } from './http-client-request.js';
import { HttpClientRequest } from './http-client-request.js';
import type { HttpClientResponse } from './http-client-response.js';
import { HttpClientAdapter } from './http-client.adapter.js';
import type { ComposedHttpClientMiddleware, HttpClientMiddleware, HttpClientMiddlewareContext, HttpClientMiddlewareNext } from './middleware.js';
import { HTTP_CLIENT_MIDDLEWARE } from './tokens.js';

export type HttpClientArgument = HttpClientOptions;

@Singleton()
export class HttpClient implements Resolvable<HttpClientArgument> {
  private readonly adapter = inject(HttpClientAdapter);
  private readonly middleware = injectAll(HTTP_CLIENT_MIDDLEWARE, undefined, { optional: true });
  private readonly headers = new HttpHeaders();
  private readonly internalStartMiddleware: HttpClientMiddleware[];
  private readonly internalEndMiddleware: HttpClientMiddleware[];

  private composedMiddleware: ComposedHttpClientMiddleware;

  readonly options = injectArgument(this, { optional: true }) ?? inject(HttpClientOptions, undefined, { optional: true }) ?? {};

  declare readonly [resolveArgumentType]: HttpClientOptions;
  constructor() {
    this.internalStartMiddleware = [
      getBuildRequestUrlMiddleware(this.options.baseUrl),
      ...((this.options.enableErrorHandling ?? true) ? [errorMiddleware] : [])
    ];

    this.internalEndMiddleware = [
      getAddRequestHeadersMiddleware(this.headers),
      getAdapterCallMiddleware(this.adapter)
    ];

    this.updateMiddleware();
  }

  addMiddleware(middleware: HttpClientMiddleware): void {
    this.middleware.push(middleware);
    this.updateMiddleware();
  }

  setDefaultHeader(name: string, value: OneOrMany<HttpValue>): void {
    this.headers.set(name, value);
  }

  deleteDefaultHeader(name: string): void {
    this.headers.remove(name);
  }

  async head(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('HEAD', url, { ...options });
  }

  async get(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('GET', url, options);
  }

  async getText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('GET', url, { ...options });
    return response.body.readAsText();
  }

  async getJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('GET', url, { ...options });
    return response.body.readAsJson();
  }

  async getBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('GET', url, { ...options });
    return response.body.readAsBuffer();
  }

  getStream(url: string, options?: HttpClientRequestOptions): ReadableStream<string> | ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('GET', url, { ...options });
      return response.body.readAsStream() as ReadableStream<Uint8Array>;
    });
  }

  getTextStream(url: string, options?: HttpClientRequestOptions): ReadableStream<string> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('GET', url, { ...options });
      return response.body.readAsTextStream();
    });
  }

  getBinaryStream(url: string, options?: HttpClientRequestOptions, readOptions?: ReadBodyOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('GET', url, { ...options });
      return response.body.readAsBinaryStream(readOptions);
    });
  }

  async post(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('POST', url, options);
  }

  async postText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('POST', url, { ...options });
    return response.body.readAsText();
  }

  async postJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('POST', url, { ...options });
    return response.body.readAsJson();
  }

  async postBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('POST', url, { ...options });
    return response.body.readAsBuffer();
  }

  postStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('POST', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async put(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('PUT', url, options);
  }

  async putText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('PUT', url, { ...options });
    return response.body.readAsText();
  }

  async putJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('PUT', url, { ...options });
    return response.body.readAsJson();
  }

  async putBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('PUT', url, { ...options });
    return response.body.readAsBuffer();
  }

  putStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('PUT', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async patch(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('PATCH', url, options);
  }

  async patchText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('PATCH', url, { ...options });
    return response.body.readAsText();
  }

  async patchJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('PATCH', url, { ...options });
    return response.body.readAsJson();
  }

  async patchBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('PATCH', url, { ...options });
    return response.body.readAsBuffer();
  }

  patchStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('PATCH', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async delete(url: string, options?: HttpClientRequestOptions): Promise<HttpClientResponse> {
    return this.request('DELETE', url, options);
  }

  async deleteText(url: string, options?: HttpClientRequestOptions): Promise<string> {
    const response = await this.request('DELETE', url, { ...options });
    return response.body.readAsText();
  }

  async deleteJson<T = UndefinableJson>(url: string, options?: HttpClientRequestOptions): Promise<T> {
    const response = await this.request('DELETE', url, { ...options });
    return response.body.readAsJson<T>();
  }

  async deleteBuffer(url: string, options?: HttpClientRequestOptions): Promise<Uint8Array> {
    const response = await this.request('DELETE', url, { ...options });
    return response.body.readAsBuffer();
  }

  deleteStream(url: string, options?: HttpClientRequestOptions): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const response = await this.request('DELETE', url, { ...options });
      return response.body.readAsBinaryStream();
    });
  }

  async request(method: HttpMethod, url: string, options: HttpClientRequestOptions = {}): Promise<HttpClientResponse> {
    const request = new HttpClientRequest(url, method, options);
    return this.rawRequest(request);
  }

  async rawRequest(request: HttpClientRequest): Promise<HttpClientResponse> {
    const context: HttpClientMiddlewareContext = { request };

    await this.composedMiddleware(context);
    assertDefined(context.response);

    return context.response;
  }

  private updateMiddleware(): void {
    this.composedMiddleware = composeAsyncMiddleware([...this.internalStartMiddleware, ...this.middleware, ...this.internalEndMiddleware], { allowMultipleNextCalls: true });
  }
}

function getBuildRequestUrlMiddleware(baseUrl: string | undefined): HttpClientMiddleware {
  async function buildUrlParametersMiddleware({ request }: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext): Promise<void> {
    if (request.mapParameters) {
      mapParameters(request, baseUrl);
    }

    return next();
  }

  return buildUrlParametersMiddleware;
}

function getAddRequestHeadersMiddleware(defaultHeaders: HttpHeaders): HttpClientMiddleware {
  async function addRequestHeadersMiddleware({ request }: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext): Promise<void> {
    const { body, authorization } = request;

    for (const [key, value] of defaultHeaders) {
      request.headers.setIfMissing(key, value);
    }

    if (isDefined(body) && isUndefined(request.headers.contentType)) {
      if (isDefined(body.json)) {
        request.headers.contentType = 'application/json';
      }
      else if (isDefined(body.text)) {
        request.headers.contentType = 'text/plain';
      }
      else if (isDefined(body.form)) {
        request.headers.contentType = 'application/x-www-form-urlencoded';
      }
      else if (isDefined(body.formData)) {
        // Form data content type header has to be set by implementation because of boundary value
      }
      else if (isDefined(body.binary)) {
        request.headers.contentType = ((isBlob(body.binary) && body.binary.type.length > 0))
          ? body.binary.type
          : 'application/octet-stream';
      }
    }

    if (isDefined(authorization) && isUndefined(request.headers.authorization)) {
      if (isDefined(authorization.basic)) {
        const base64 = encodeBase64(encodeUtf8(`${authorization.basic.username}:${authorization.basic.password}`));
        request.headers.authorization = `Basic ${base64}`;
      }
      else if (isDefined(authorization.bearer)) {
        request.headers.authorization = `Bearer ${authorization.bearer}`;
      }
      else if (isDefined(authorization.token)) {
        request.headers.authorization = `Token ${authorization.token}`;
      }
    }

    return next();
  }

  return addRequestHeadersMiddleware;
}

async function errorMiddleware(context: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext): Promise<void> {
  try {
    await next();

    assertDefined(context.response);

    if (context.request.throwOnNon200 && ((context.response.statusCode < 200) || (context.response.statusCode >= 400))) {
      const httpError = await HttpError.create(HttpErrorReason.StatusCode, context.request, context.response, `Status code ${context.response.statusCode}.`);
      throw httpError;
    }
  }
  catch (error: unknown) {
    if (!(error instanceof HttpError) || (error.responseInstance?.headers.contentType?.includes('json') == false)) {
      throw error;
    }

    if (isDefined(error.responseBody)) {
      if (!isErrorResponse(error.responseBody) || !hasErrorHandler(error.responseBody)) {
        throw error;
      }

      const parsedError = parseErrorResponse(error.responseBody, false);

      if (isDefined(parsedError)) {
        throw parsedError;
      }
    }

    throw error;
  }
}

// eslint-disable-next-line max-statements, max-lines-per-function, complexity
function mapParameters(request: HttpClientRequest, baseUrl?: string): void {
  const isGetOrHead = (request.method == 'GET') || (request.method == 'HEAD');

  let url: URL;
  const filteredParameterEntries = objectEntries(request.parameters ?? {}).filter(([_, value]) => isDefined(value));
  const filteredParameters = Object.fromEntries(filteredParameterEntries);
  let parameterEntries = new Set(filteredParameterEntries);

  if (request.mapParametersToUrl) {
    const { parsedUrl, parametersRest } = buildUrl(request.url, filteredParameters, { arraySeparator: request.urlParametersSeparator });

    url = new URL(parsedUrl, baseUrl);
    parameterEntries = new Set(objectEntries(parametersRest));
  }
  else {
    url = new URL(request.url, baseUrl);
  }

  if (request.mapParametersToBody && !isGetOrHead && isUndefined(request.body)) {
    request.body = { json: Object.fromEntries(parameterEntries) };
    parameterEntries.clear();
  }

  if (request.mapParametersToQuery) {
    for (const entry of parameterEntries) {
      const [parameter, value] = entry;

      if (isUndefined(value) || (isObject(value) && !isArray(value))) {
        continue;
      }

      for (const val of toArray(value)) {
        url.searchParams.append(parameter as string, normalizeSingleHttpValue(val as HttpValue));
      }

      parameterEntries.delete(entry);
    }
  }

  if (parameterEntries.size > 0) {
    throw new HttpError(HttpErrorReason.InvalidRequest, request, undefined, 'Not all parameters could be mapped to url, query and body because request is either GET/HEAD or body is already defined');
  }

  if (isDefined(request.query)) {
    for (const [key, valueOrValues] of request.query) {
      const normalizedValues = normalizeHttpValue(valueOrValues);

      if (isDefined(normalizedValues)) {
        for (const normalizedValue of toArray(normalizedValues)) {
          url.searchParams.append(key, normalizedValue.toString());
        }
      }
    }
  }

  request.url = url.href;
}

function getAdapterCallMiddleware(adapter: HttpClientAdapter): HttpClientMiddleware {
  async function adapterCallMiddleware(context: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext): Promise<void> {
    context.response = await adapter.call(context.request); // eslint-disable-line require-atomic-updates
    return next();
  }

  return adapterCallMiddleware;
}
