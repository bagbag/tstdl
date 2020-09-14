import * as KoaRouter from '@koa/router';
import type { ErrorResponse } from '@tstdl/base/api';
import { createErrorResponse, getErrorStatusCode, hasErrorHandler } from '@tstdl/base/api';
import type { Logger } from '@tstdl/base/logger';
import type { Json, JsonObject, StringMap, Type, UndefinableJson } from '@tstdl/base/types';
import { precisionRound, Timer, toArray } from '@tstdl/base/utils';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Http2ServerRequest, Http2ServerResponse } from 'http2';
import * as Koa from 'koa';
import type { Readable } from 'stream';
import type { HttpServer } from '../http';
import type { NonObjectBufferMode } from '../utils';
import { readStream } from '../utils';
import type { TypedReadable } from '../utils/typed-readable';
import type { ApiEndpoint } from './endpoint';

type Context = Koa.ParameterizedContext<void, KoaRouter.RouterParamContext<void, void>>;

export type HttpRequest = {
  url: URL,
  method: string,
  ip: string,
  headers: StringMap<string | string[]>
};

export type HttpResponse<JsonType extends UndefinableJson = UndefinableJson> = {
  headers?: StringMap<string | string[]>,
  statusCode?: number,
  statusMessage?: string,
  text?: string,
  json?: JsonType,
  stream?: Readable,
  binary?: Buffer
};

export enum BodyType {
  None = 0,
  String = 1,
  Json = 2, // eslint-disable-line no-shadow
  Stream = 3,
  Binary = 4
}

export enum RequestMethod {
  Get = 'get',
  Post = 'post'
}

export type Query = StringMap<string>;

export type BodyValueType<B extends BodyType>
  = B extends BodyType.Json ? Json
  : B extends BodyType.String ? string
  : B extends BodyType.Stream ? Readable
  : B extends BodyType.Binary ? Buffer
  : undefined;

export type RequestData<B extends BodyType = BodyType.None> = {
  parameters: Query,
  body: BodyValueType<B>
};

export type RequestHandler = (request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse) => void;

export type RouteHandler<RouteParameters, EndpointParameters, EndpointResult, EndpointContext> = (request: HttpRequest, parameters: RouteParameters, endpoint: ApiEndpoint<EndpointParameters, EndpointResult, EndpointContext>) => HttpResponse | Promise<HttpResponse>;

export type AnyRoute = Route<RequestMethod, any, BodyType, any, any, any>;
export type Route<Method extends RequestMethod, RouteParameters, B extends BodyType, EndpointParameters, EndpointResult, EndpointContext> = {
  method: Method | Method[],
  path: string | RegExp,
  bodyType?: B,
  parametersTransformer: RouteParametersTransformer<RequestData<B>, RouteParameters>,
  handler: RouteHandler<RouteParameters, EndpointParameters, EndpointResult, EndpointContext>,
  endpoint: ApiEndpoint<EndpointParameters, EndpointResult, EndpointContext>
};

export function simpleRoute<Method extends RequestMethod, B extends BodyType, EndpointResult extends UndefinableJson>(
  { method, path, bodyType, endpoint }: Omit<Route<Method, DefaultParametersTransformerReturnType<B>, B, DefaultParametersTransformerReturnType<B>, EndpointResult, HttpRequest>, 'handler' | 'parametersTransformer'>
): Route<Method, DefaultParametersTransformerReturnType<B>, B, DefaultParametersTransformerReturnType<B>, EndpointResult, HttpRequest> {
  return route(
    {
      method,
      path,
      bodyType,
      handler: getDefaultRouteHandler(),
      parametersTransformer: getDefaultParametersTransformer(),
      endpoint
    }
  );
}

// eslint-disable-next-line no-shadow
export function route<Method extends RequestMethod, RouteParameters, B extends BodyType, EndpointParameters, EndpointResult, EndpointContext>(route: Route<Method, RouteParameters, B, EndpointParameters, EndpointResult, EndpointContext>): Route<Method, RouteParameters, B, EndpointParameters, EndpointResult, EndpointContext> {
  return route;
}

export type RouteParametersTransformer<In, Out> = (data: In, bodyType: BodyType) => Out;

export function getDefaultRouteHandler<Parameters, Result extends UndefinableJson>(): RouteHandler<Parameters, Parameters, Result, HttpRequest> {
  return getSimpleRouteHandler((result) => ({ json: result }));
}

export function getSimpleRouteHandler<Parameters, Result>(handler: (result: Result) => HttpResponse): RouteHandler<Parameters, Parameters, Result, HttpRequest> {
  async function routeHandler(
    request: HttpRequest,
    parameters: Parameters,
    endpoint: ApiEndpoint<Parameters, Result, HttpRequest>
  ): Promise<HttpResponse> {
    const result = await endpoint(parameters, request);
    return handler(result);
  }

  return routeHandler;
}

type DefaultParametersTransformerReturnType<B extends BodyType> = B extends BodyType.None ? StringMap : StringMap & { body: BodyValueType<B> };

export function getDefaultParametersTransformer<B extends BodyType>(): RouteParametersTransformer<RequestData<B>, DefaultParametersTransformerReturnType<B>> {
  function defaultParametersTransformer(data: RequestData<B>, bodyType: B): DefaultParametersTransformerReturnType<B> {
    let transformed: StringMap = { ...data.parameters };

    if (bodyType == BodyType.Json && typeof data.body == 'object' && !Array.isArray(data.body)) {
      transformed = { ...transformed, ...(data as RequestData<BodyType.Json>).body as JsonObject };
    }
    else if (bodyType != BodyType.None) {
      transformed = { ...transformed, body: data.body };
    }

    return transformed as DefaultParametersTransformerReturnType<B>;
  }

  return defaultParametersTransformer as RouteParametersTransformer<RequestData<B>, DefaultParametersTransformerReturnType<B>>;
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
    // eslint-disable-next-line no-shadow
    for (const route of routes) {
      const methods = toArray(route.method);

      for (const method of methods) {
        switch (method) {
          case RequestMethod.Get:
            this.registerRoute(method, route.path, BodyType.None, route.parametersTransformer, route.endpoint, route.handler);
            break;

          case RequestMethod.Post:
            this.registerRoute(method, route.path, route.bodyType ?? BodyType.Json, route.parametersTransformer, route.endpoint, route.handler);
            break;

          default:
            throw new Error('unknown route method');
        }
      }
    }
  }


  private registerRoute<RouteParameters, B extends BodyType, EndpointParameters, EndpointContext, Result>(method: RequestMethod, path: string | RegExp, bodyType: B, parametersTransformer: RouteParametersTransformer<RequestData<B>, RouteParameters>, endpoint: ApiEndpoint<EndpointParameters, Result, EndpointContext>, handler: RouteHandler<RouteParameters, EndpointParameters, Result, EndpointContext>): void {
    this.router.register(path, [method], async (context: Context, next) => {
      await this.handle(context, bodyType, parametersTransformer, endpoint, handler);
      return next();
    });
  }

  // eslint-disable-next-line max-lines-per-function, max-statements, class-methods-use-this
  private async handle<RouteParameters, B extends BodyType, EndpointParameters, EndpointContext, Result>(context: Context, bodyType: B, parametersTransformer: RouteParametersTransformer<RequestData<B>, RouteParameters>, endpoint: ApiEndpoint<EndpointParameters, Result, EndpointContext>, handler: RouteHandler<RouteParameters, EndpointParameters, Result, EndpointContext>): Promise<void> {
    const { request, response, params } = context;
    const { query: { ...query } } = request;

    const requestParameters = { ...params, ...query };

    let body: BodyValueType<B>;
    try {
      body = await getBody(request, bodyType);
    }
    catch (error: unknown) {
      response.status = getErrorStatusCode(error as Error, 400);
      response.body = createErrorResponse(error as Error);
      return;
    }

    const requestData: RequestData<B> = { parameters: requestParameters, body };

    const handlerParameters = parametersTransformer(requestData, bodyType);
    const httpRequest: HttpRequest = {
      url: context.URL,
      method: context.request.method,
      headers: context.req.headers as StringMap<string | string[]>,
      ip: context.request.ip
    };

    const httpResponse = await handler(httpRequest, handlerParameters, endpoint);
    applyResponse(response, httpResponse);
  }
}

function applyResponse(response: Koa.Response, responseResult: HttpResponse): void {
  if (responseResult.json != undefined) {
    response.set('Content-Type', 'application/json');
    response.body = JSON.stringify(responseResult.json);
  }
  else if (responseResult.text != undefined) {
    response.body = responseResult.text;
  }
  else if (responseResult.stream != undefined) {
    response.body = responseResult.stream;
  }
  else if (responseResult.binary != undefined) {
    response.body = responseResult.binary;
  }

  if (responseResult.headers != undefined) {
    for (const [field, value] of Object.entries(responseResult.headers)) {
      response.set(field, value);
    }
  }

  if (responseResult.statusCode != undefined) {
    response.status = responseResult.statusCode;
  }

  if (responseResult.statusMessage != undefined) {
    response.message = responseResult.statusMessage;
  }
}

async function getBody<B extends BodyType>(request: Koa.Request, bodyType: B): Promise<BodyValueType<B>> {
  switch (bodyType) {
    case BodyType.String:
      return readBody(request) as unknown as Promise<BodyValueType<B>>;

    case BodyType.Json:
      return readJsonBody(request) as unknown as Promise<BodyValueType<B>>;

    case BodyType.Stream:
      return request.req as unknown as Promise<BodyValueType<B>>;

    case BodyType.Binary:
      return readStream(request.req as TypedReadable<NonObjectBufferMode>) as unknown as Promise<BodyValueType<B>>;

    case BodyType.None:
      return undefined as unknown as Promise<BodyValueType<B>>;

    default:
      throw new Error('unknown BodyType');
  }
}

async function readJsonBody(request: Koa.Request, maxLength: number = 10e6): Promise<Json> {
  const body = await readBody(request, maxLength);
  const json = JSON.parse(body) as Json;
  return json;
}

async function readBody(request: Koa.Request, maxBytes: number = 10e6): Promise<string> {
  const { req, charset } = request;

  const rawBody = await readStream(req as TypedReadable<NonObjectBufferMode>, maxBytes);
  const encoding = (charset.length > 0) ? charset : 'utf-8';
  const body = rawBody.toString(encoding as BufferEncoding);

  return body;
}

function errorCatchMiddleware(logger: Logger, supressedErrors: Set<Type<Error>>) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return async function errorCatchMiddleware({ response }: Context, next: () => Promise<any>): Promise<any> {
    try {
      // eslint-disable-next-line callback-return
      await next();
    }
    catch (error: unknown) {
      const errorConstructor = (error as Error).constructor as Type<Error>;
      const supressed = supressedErrors.has(errorConstructor);

      if (!supressed) {
        logger.error(error as Error);
      }

      if (hasErrorHandler(errorConstructor)) {
        response.status = getErrorStatusCode(error as Error);
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
  const roundedMilliseconds = precisionRound(milliseconds, 2);

  context.response.set('X-Response-Time', `${roundedMilliseconds}ms`);
}
