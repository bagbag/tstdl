import type { ErrorResponse } from '#/api';
import { createErrorResponse, getErrorStatusCode, hasErrorHandler } from '#/api';
import type { CustomError, CustomErrorStatic } from '#/error';
import { BadRequestError, MaxBytesExceededError, UnsupportedMediaTypeError } from '#/error';
import type { HttpAutoBodyType, HttpBody, HttpBodyType, HttpJsonBodyType, HttpMethod, HttpNoneBodyType, HttpServerRequest, HttpServerResponse, NormalizedHttpHeaders, NormalizedHttpQuery, NormalizedHttpValueMap } from '#/http';
import { normalizeHttpValue } from '#/http';
import type { Logger } from '#/logger';
import type { Json, JsonObject, StringMap, Type, UndefinableJson } from '#/types';
import { toArray } from '#/utils/array';
import { decodeText } from '#/utils/encoding';
import { round } from '#/utils/math';
import type { NonObjectBufferMode } from '#/utils/stream-helper-types';
import { readStream } from '#/utils/stream-reader';
import { Timer } from '#/utils/timer';
import { isDefined, isObject, isUndefined } from '#/utils/type-guards';
import * as KoaRouter from '@koa/router';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Http2ServerRequest, Http2ServerResponse } from 'http2';
import * as Koa from 'koa';
import type { Readable } from 'stream';
import type { HttpServer } from '../http/server';
import type { TypedReadable } from '../utils/typed-readable';
import type { ApiEndpoint } from './endpoint';

type Context = Koa.ParameterizedContext<void, KoaRouter.RouterParamContext<void, void>>;

export type RequestData<B extends HttpBodyType = HttpAutoBodyType> = {
  parameters: NormalizedHttpQuery,
  body: HttpBody<B>
};

export type RequestHandler = (request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse) => void;

export type RouteHandler<RouteParameters, EndpointParameters, EndpointResult, EndpointContext> = (request: HttpServerRequest, parameters: RouteParameters, endpoint: ApiEndpoint<EndpointParameters, EndpointResult, EndpointContext>) => HttpServerResponse | Promise<HttpServerResponse>;

export type AnyRoute = Route<HttpMethod, any, HttpBodyType, any, any, any>;
export type Route<Method extends HttpMethod, RouteParameters, B extends HttpBodyType, EndpointParameters, EndpointResult, EndpointContext> = {
  method: Method | Method[],
  path: string | RegExp,
  bodyType?: B,
  maxRequestBodyBytes?: number,
  requestDataTransformer: RouteRequestDataTransformer<RequestData<B>, RouteParameters>,
  handler: RouteHandler<RouteParameters, EndpointParameters, EndpointResult, EndpointContext>,
  endpoint: ApiEndpoint<EndpointParameters, EndpointResult, EndpointContext>
};

export function simpleRoute<Method extends HttpMethod, B extends HttpBodyType, EndpointResult extends UndefinableJson>(
  { method, path, bodyType, maxRequestBodyBytes, endpoint }: Omit<Route<Method, DefaultRequestDataTransformerReturnType<B>, B, DefaultRequestDataTransformerReturnType<B>, EndpointResult, HttpServerRequest>, 'handler' | 'requestDataTransformer'>
): Route<Method, DefaultRequestDataTransformerReturnType<B>, B, DefaultRequestDataTransformerReturnType<B>, EndpointResult, HttpServerRequest> {
  return route(
    {
      method,
      path,
      bodyType,
      maxRequestBodyBytes,
      handler: getJsonRouteHandler(),
      requestDataTransformer: getDefaultRequestDataTransformer(),
      endpoint
    }
  );
}

// eslint-disable-next-line @typescript-eslint/no-shadow
export function route<Method extends HttpMethod, RouteParameters, B extends HttpBodyType, EndpointParameters, EndpointResult, EndpointContext>(route: Route<Method, RouteParameters, B, EndpointParameters, EndpointResult, EndpointContext>): Route<Method, RouteParameters, B, EndpointParameters, EndpointResult, EndpointContext> {
  return route;
}

type RouteRequestDataTransformerContext = {
  request: Koa.Request
};

export type RouteRequestDataTransformer<In, Out> = (data: In, bodyType: HttpBodyType, context: RouteRequestDataTransformerContext) => Out;

export function getTextRouteHandler<Parameters, Result extends string>(): RouteHandler<Parameters, Parameters, Result, HttpServerRequest> {
  return getSimpleRouteHandler((result) => ({ body: { text: result } }));
}

export function getJsonRouteHandler<Parameters, Result extends UndefinableJson>(): RouteHandler<Parameters, Parameters, Result, HttpServerRequest> {
  return getSimpleRouteHandler((result) => ({ body: { json: result } }));
}

export function getBufferRouteHandler<Parameters, Result extends ArrayBuffer>(): RouteHandler<Parameters, Parameters, Result, HttpServerRequest> {
  return getSimpleRouteHandler((result) => ({ body: { buffer: result } }));
}

export function getStreamRouteHandler<Parameters, Result extends Readable>(): RouteHandler<Parameters, Parameters, Result, HttpServerRequest> {
  return getSimpleRouteHandler((result) => ({ body: { stream: result } }));
}

export function getSimpleRouteHandler<Parameters, Result>(handler: (result: Result) => HttpServerResponse): RouteHandler<Parameters, Parameters, Result, HttpServerRequest> {
  async function routeHandler(
    request: HttpServerRequest,
    parameters: Parameters,
    endpoint: ApiEndpoint<Parameters, Result, HttpServerRequest>
  ): Promise<HttpServerResponse> {
    const result = await endpoint(parameters, request);
    return handler(result);
  }

  return routeHandler;
}

type DefaultRequestDataTransformerReturnType<B extends HttpBodyType> = undefined extends null ? void
  : B extends HttpNoneBodyType ? StringMap
  : B extends HttpJsonBodyType ? JsonObject
  : StringMap & { body: HttpBody<B> };

export function getDefaultRequestDataTransformer<B extends HttpBodyType>(): RouteRequestDataTransformer<RequestData<B>, DefaultRequestDataTransformerReturnType<B>> {
  function defaultRequestDataTransformer(data: RequestData<B>, bodyType: B, context: RouteRequestDataTransformerContext): DefaultRequestDataTransformerReturnType<B> {
    let transformed: StringMap = { ...data.parameters };

    const requestBodyType = contentTypeToBodyType(context.request.type);

    if ((bodyType == 'json' && isObject(data.body) && !Array.isArray(data.body)) || (bodyType == 'auto' && requestBodyType == 'json')) {
      transformed = { ...transformed, ...(data as RequestData<'json'>).body as JsonObject };
    }
    else if (bodyType != 'none' && isDefined(data.body)) {
      transformed = { ...transformed, body: data.body };
    }

    return transformed as DefaultRequestDataTransformerReturnType<B>;
  }

  return defaultRequestDataTransformer as RouteRequestDataTransformer<RequestData<B>, DefaultRequestDataTransformerReturnType<B>>;
}

export function noopRequestDataTransformer<B extends HttpBodyType>(data: RequestData<B>): RequestData<B> {
  return data;
}

export class HttpApi {
  private readonly logger: Logger;
  private readonly koa: Koa<void, void>;
  private readonly router: KoaRouter<void, void>;
  private readonly requestHandler: RequestHandler;
  private readonly supressedErrors: Set<Type<Error>>;

  constructor({ prefix, logger, behindProxy = false }: { prefix?: string, logger: Logger, behindProxy?: boolean }) {
    this.logger = logger;

    this.koa = new Koa();
    this.router = new KoaRouter();
    this.supressedErrors = new Set<Type<Error>>();

    this.requestHandler = this.koa.callback();

    this.koa.proxy = behindProxy;

    if (prefix != undefined) {
      this.router.prefix(prefix);
    }

    this.koa.use(responseTimeMiddleware);
    this.koa.use(errorCatchMiddleware(logger, this.supressedErrors));
    this.koa.use(this.router.routes());
    this.koa.use(this.router.allowedMethods());
  }

  attachHttpServer(httpServer: HttpServer): void {
    httpServer.registerRequestHandler((request, response) => this.handleRequest(request, response));
  }

  handleRequest(request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse): void {
    this.requestHandler(request, response);
  }

  supressErrorLog(...errorConstructors: Type<Error>[]): void {
    for (const errorConstructor of errorConstructors) {
      this.supressedErrors.add(errorConstructor);
    }
  }

  registerRoutes(...routes: AnyRoute[]): void {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    for (const route of routes) {
      const methods = toArray(route.method);

      for (const method of methods) {
        switch (method) {
          case 'get':
            this.registerRoute(method, route.path, 'none', route.maxRequestBodyBytes ?? 10e6, route.requestDataTransformer, route.endpoint, route.handler);
            break;

          case 'post':
          case 'patch':
          case 'put':
          case 'delete':
            this.registerRoute(method, route.path, route.bodyType ?? 'auto', route.maxRequestBodyBytes ?? 10e6, route.requestDataTransformer, route.endpoint, route.handler);
            break;

          default:
            throw new Error('unknown route method');
        }
      }
    }
  }


  private registerRoute<RouteParameters, B extends HttpBodyType, EndpointParameters, EndpointContext, Result>(method: HttpMethod, path: string | RegExp, bodyType: B, maxBytes: number, requestDataTransformer: RouteRequestDataTransformer<RequestData<B>, RouteParameters>, endpoint: ApiEndpoint<EndpointParameters, Result, EndpointContext>, handler: RouteHandler<RouteParameters, EndpointParameters, Result, EndpointContext>): void {
    this.router.register(path, [method], async (context: Context, next) => {
      await this.handle(context, bodyType, maxBytes, requestDataTransformer, endpoint, handler);
      return next();
    });
  }

  // eslint-disable-next-line max-lines-per-function, max-statements, class-methods-use-this
  private async handle<RouteParameters, B extends HttpBodyType, EndpointParameters, EndpointContext, Result>(context: Context, bodyType: B, maxBytes: number, requestDataTransformer: RouteRequestDataTransformer<RequestData<B>, RouteParameters>, endpoint: ApiEndpoint<EndpointParameters, Result, EndpointContext>, handler: RouteHandler<RouteParameters, EndpointParameters, Result, EndpointContext>): Promise<void> {
    const { request, response, params } = context;
    const { query: { ...query } } = request;

    const requestParameters = { ...params, ...query };

    let body: HttpBody<B>;
    try {
      body = await getBody(request, bodyType, maxBytes);
    }
    catch (error: unknown) {
      response.status = getErrorStatusCode(error as CustomError, 400);
      response.body = createErrorResponse(error as Error);
      return;
    }

    const requestData: RequestData<B> = { parameters: requestParameters as NormalizedHttpValueMap, body };

    const handlerParameters = requestDataTransformer(requestData, bodyType, { request });
    const httpRequest: HttpServerRequest = {
      url: context.URL,
      method: convertMethod(context.request.method),
      headers: context.req.headers as NormalizedHttpHeaders,
      urlParameters: params,
      query: query as NormalizedHttpQuery,
      ip: context.request.ip,
      body
    };

    const httpResponse = await handler(httpRequest, handlerParameters, endpoint);
    applyResponse(response, httpResponse);
  }
}

function applyResponse(response: Koa.Response, responseResult: HttpServerResponse): void {
  if (responseResult.body?.json != undefined) {
    response.set('Content-Type', 'application/json; charset=utf-8');
    response.body = JSON.stringify(responseResult.body.json);
  }
  else if (responseResult.body?.text != undefined) {
    response.body = responseResult.body.text;
  }
  else if (responseResult.body?.stream != undefined) {
    response.body = responseResult.body.stream;
  }
  else if (responseResult.body?.buffer != undefined) {
    response.body = responseResult.body.buffer;
  }

  if (responseResult.headers != undefined) {
    for (const [field, value] of Object.entries(responseResult.headers)) {
      const normalizedValues = normalizeHttpValue(value);

      if (isUndefined(normalizedValues)) {
        continue;
      }

      for (const normalizedValue of toArray(normalizedValues)) {
        response.append(field, normalizedValue);
      }
    }
  }

  if (responseResult.statusCode != undefined) {
    response.status = responseResult.statusCode;
  }

  if (responseResult.statusMessage != undefined) {
    response.message = responseResult.statusMessage;
  }
}

async function getBody<B extends HttpBodyType>(request: Koa.Request, bodyType: B, maxBytes: number = 10e6): Promise<HttpBody<B>> {
  switch (bodyType) {
    case 'none':
      return undefined as HttpBody<B>;

    case 'text':
      return readBody(request, maxBytes) as Promise<HttpBody<B>>;

    case 'json':
      return readJsonBody(request, maxBytes) as Promise<HttpBody<B>>;

    case 'stream':
      return request.req as unknown as HttpBody<B>;

    case 'buffer':
      return readRawBody(request, maxBytes) as Promise<HttpBody<B>>;

    case 'auto':
      const requestBodyType = contentTypeToBodyType(request.type);
      return getBody(request, requestBodyType, maxBytes) as Promise<HttpBody<B>>;

    default:
      throw new Error('unknown HttpBodyType');
  }
}

async function readJsonBody(request: Koa.Request, maxBytes: number): Promise<Json> {
  const body = await readBody(request, maxBytes);

  try {
    const json = JSON.parse(body) as Json;
    return json;
  }
  catch (error: unknown) {
    throw new UnsupportedMediaTypeError('expected application/json');
  }
}

async function readBody(request: Koa.Request, maxBytes: number): Promise<string> {
  const rawBody = await readRawBody(request, maxBytes);
  const encoding = (isDefined(request.charset) && (request.charset.length > 0)) ? request.charset : undefined;
  const body = decodeText(rawBody, encoding);

  return body;
}

async function readRawBody(request: Koa.Request, maxBytes: number): Promise<ArrayBuffer> {
  if (request.length > maxBytes) {
    throw new MaxBytesExceededError(`maximum content-length of ${maxBytes} bytes exceeded`);
  }

  const buffer = await readStream(request.req as TypedReadable<NonObjectBufferMode>, maxBytes);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function errorCatchMiddleware(logger: Logger, supressedErrors: Set<Type<Error>>) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return async function errorCatchMiddleware({ response }: Context, next: () => Promise<any>): Promise<any> {
    try {
      // eslint-disable-next-line callback-return
      await next();
    }
    catch (error: unknown) {
      const errorConstructor = (error as Error).constructor as Type<Error> & CustomErrorStatic;
      const supressed = supressedErrors.has(errorConstructor);

      if (!supressed) {
        logger.error(error as Error);
      }

      if (hasErrorHandler(errorConstructor)) {
        response.status = getErrorStatusCode(error as CustomError);
        (response.body as ErrorResponse) = createErrorResponse(error as Error);
      }
      else {
        response.status = 500;
        (response.body as ErrorResponse) = createErrorResponse('500', 'Internal Server Error');
      }
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function corsMiddleware(context: Context, next: () => Promise<any>): Promise<any> {
  context.response.set({
    /* eslint-disable @typescript-eslint/naming-convention */
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': context.request.get('Access-Control-Request-Headers')
    /* eslint-enable @typescript-eslint/naming-convention */
  });

  return next();
}

async function responseTimeMiddleware(context: Context, next: () => Promise<any>): Promise<void> {
  const milliseconds = await Timer.measureAsync(next);
  const roundedMilliseconds = round(milliseconds, 2);

  context.response.set('X-Response-Time', `${roundedMilliseconds}ms`);
}

function convertMethod(method: string): HttpMethod {
  const normalized = method.toLowerCase();

  switch (normalized) {
    case 'get':
    case 'post':
    case 'put':
    case 'patch':
    case 'head':
    case 'delete':
      return normalized;

    default:
      throw new Error(`unsupported HTTP method ${method}`);
  }
}

function contentTypeToBodyType(contentType: string): HttpBodyType {
  switch (contentType) {
    case 'text/plain':
      return 'text';

    case 'application/json':
      return 'json';

    case 'application/octet-stream':
      return 'buffer';

    case '':
    case undefined:
      return 'none';

    default:
      throw new BadRequestError('unsupported Content-Type');
  }
}
