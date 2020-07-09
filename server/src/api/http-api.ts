import * as KoaRouter from '@koa/router';
import { createErrorResponse, ErrorResponse, getErrorStatusCode, hasErrorHandler } from '@tstdl/base/api';
import { Logger } from '@tstdl/base/logger';
import { StringMap, Type, UndefinableJson } from '@tstdl/base/types';
import { precisionRound, Timer } from '@tstdl/base/utils';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import * as Koa from 'koa';
import { Readable } from 'stream';
import { NonObjectBufferMode, readStream } from '../utils';
import { TypedReadable } from '../utils/typed-readable';
import { ApiEndpoint } from './endpoint';
import { EndpointValidator } from './validation';
import { ValidationError } from './validation/error';

type Context = Koa.ParameterizedContext<void, KoaRouter.RouterParamContext<void, void>>;

export type HttpRequest = {
  url: URL,
  method: string,
  ip: string,
  headers: StringMap<string | string[]>
};

export type HttpResponse<JsonType extends UndefinableJson = StringMap> = {
  headers?: StringMap<string | string[]>,
  statusCode?: number,
  statusMessage?: string,
  text?: string,
  json?: JsonType,
  stream?: Readable,
  binary?: Buffer
};

export enum BodyType {
  None,
  String,
  Json,
  Stream,
  Binary
}

export type Query = StringMap<string>;
export type Body = UndefinableJson | Readable | Buffer | undefined;

export type GetData = { parameters: Query };
export type PostData<B extends BodyType> = GetData & {
  body: B extends BodyType.Json ? UndefinableJson
  : B extends BodyType.String ? string
  : B extends BodyType.Stream ? Readable
  : B extends BodyType.Binary ? Buffer
  : undefined
};

export type GetValidationFunction<Parameters = GetData> = EndpointValidator<GetData, Parameters>;
export type PostValidationFunction<B extends BodyType, Parameters = PostData<BodyType>> = EndpointValidator<PostData<B>, Parameters>;

export type RequestHandler = (request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse) => void;

export type RouteHandler<Data, Result> = (data: Data, request: HttpRequest, apiEndpoint: ApiEndpoint<Data, Result>) => HttpResponse | Promise<HttpResponse>;

export type Route = GetRoute<any, any> | PostRoute<any, BodyType, any>;

type RouteBase<Type extends 'get' | 'post', Parameters, Result> = {
  type: Type,
  path: string,
  endpoint: ApiEndpoint<Parameters, Result>
};

export type GetRoute<Parameters, Result> = RouteBase<'get', Parameters, Result> & {
  parametersTransformer?: GetApiEndpointParametersTransformer<Parameters>
};

export type PostRoute<Parameters, B extends BodyType, Result> = RouteBase<'post', Parameters, Result> & {
  bodyType: B,
  parametersTransformer?: PostApiEndpointParametersTransformer<B, Parameters>
};

export type GetApiEndpointParametersTransformer<Parameters> = (data: GetData) => Parameters;
export type PostApiEndpointParametersTransformer<B extends BodyType, Parameters> = (data: PostData<B>) => Parameters;

export function getDefaultRouteHandler<Parameters, Result>(endpoint: ApiEndpoint<Parameters, Result>): RouteHandler<Parameters, Result> {
  const handler: RouteHandler<Parameters, Result> = async (parameters) => {
    const result = await endpoint(parameters);

    const response: HttpResponse = {
      json: result
    };

    return response;
  };

  return handler;
}

export const getDefaultGetParametersTransformer: GetApiEndpointParametersTransformer<StringMap> = () => (data: GetData) => data.parameters;
export const getDefaultPostParametersTransformer: PostApiEndpointParametersTransformer<BodyType.Json, StringMap> = () => (data: PostData<BodyType.Json>) => ({ ...data.parameters, ...(data.body as StringMap) });

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

    this.koa.use(errorCatchMiddleware(logger, this.supressedErrors));
    this.koa.use(responseTimeMiddleware);
    this.koa.use(this.router.routes());
    this.koa.use(this.router.allowedMethods());
  }

  handleRequest(request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse): void {
    this.requestHandler(request, response);
  }

  supressErrorLog(...errorConstructors: Type<Error>[]): void {
    for (const errorConstructor of errorConstructors) {
      this.supressedErrors.add(errorConstructor);
    }
  }

  registerRoutes(...routes: Route[]): void {
    for (const route of routes) {
      const validator = route.parametersTransformer ?? ;

      switch (route.type) {
        case 'get':
          this.registerGetRoute(route.path, validator, route.endpoint);
          break;

        case 'post':
          this.registerPostRoute(route.path, route.bodyType, validator, route.endpoint);
          break;

        default:
          throw new Error('unknown route type');
      }
    }
  }

  registerGetRoute<Parameters, Result>(path: string, endpoint: ApiEndpoint<Parameters, Result>, parametersTransform: GetApiEndpointParametersTransformer<Parameters>, handler: RouteHandler<Parameters, Result> = getDefaultRouteHandler(endpoint)): void {
    this.router.get(path, async (context: Context, next) => {
      await this.handle(context, BodyType.None, validator, handler);
      return next();
    });
  }

  registerPostRoute<ValidatedData, B extends BodyType>(path: string, bodyType: B, validator: PostValidationFunction<B, ValidatedData>, handler: RouteHandler<ValidatedData>): void {
    this.router.post(path, async (context: Context, next) => {
      await this.handle(context, bodyType, validator, handler);
      return next();
    });
  }

  // eslint-disable-next-line max-lines-per-function, max-statements, class-methods-use-this
  private async handle<B extends BodyType, Parameters>(context: Context, bodyType: BodyType, validator: GetValidationFunction<Parameters> | PostValidationFunction<B, Parameters>, handler: RouteHandler<Parameters>): Promise<void> {
    const { request, response, params } = context;
    const { method, query: { ...query } } = request;

    const parameters = { ...params, ...query };

    let body: Body;
    try {
      body = await getBody(request, bodyType);
    }
    catch (error) {
      response.status = getErrorStatusCode(error as Error, 400);
      response.body = createErrorResponse(error as Error);
      return;
    }

    let requestData: GetData | PostData<B>;

    switch (method) {
      case 'GET':
        requestData = { parameters };
        break;

      case 'POST':
        requestData = { parameters, body } as PostData<B>;
        break;

      default:
        response.status = 405;
        response.body = createErrorResponse('Method Not Allowed', `method ${request.method} not supported for this endpoint`);
        return;
    }

    const validationResult = await (
      method == 'GET'
        ? (validator as GetValidationFunction<Parameters>)(requestData)
        : (validator as PostValidationFunction<B, Parameters>)(requestData as PostData<B>)
    );

    if (validationResult.valid) {
      const parsedRequestData = validationResult.value;
      const request: HttpRequest = {
        url: context.URL,
        method: context.request.method,
        headers: context.req.headers as StringMap<string | string[]>,
        ip: context.request.ip
      };

      const handlerReturnValue = handler(parsedRequestData, request);
      const responseResult = (handlerReturnValue instanceof Promise) ? await handlerReturnValue : handlerReturnValue;

      applyResponse(response, responseResult);
    }
    else {
      response.status = 400;

      (response.body as ErrorResponse) = (validationResult.error instanceof ValidationError)
        ? createErrorResponse(validationResult.error.name, validationResult.error.message, validationResult.error.details)
        : createErrorResponse('invalid request data', 'validation failed', validationResult.error);
    }
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

async function getBody(request: Koa.Request, bodyType: BodyType): Promise<Body> {
  switch (bodyType) {
    case BodyType.String:
      return readBody(request);

    case BodyType.Json:
      return readJsonBody(request);

    case BodyType.Stream:
      return request.req;

    case BodyType.Binary:
      return readStream(request.req as TypedReadable<NonObjectBufferMode>);

    case BodyType.None:
      return undefined;

    default:
      throw new Error('unknown body-type');
  }
}

async function readJsonBody(request: Koa.Request, maxLength: number = 10e6): Promise<UndefinableJson> {
  const body = await readBody(request, maxLength);
  const json = JSON.parse(body) as UndefinableJson;
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
  // eslint-disable-next-line no-shadow
  return async function errorCatchMiddleware({ response }: Context, next: () => Promise<any>): Promise<any> {
    try {
      // eslint-disable-next-line callback-return
      await next();
    }
    catch (error) {
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': context.request.get('Access-Control-Request-Headers')
  });

  return next();
}

async function responseTimeMiddleware(context: Context, next: () => Promise<any>): Promise<void> {
  const milliseconds = await Timer.measureAsync(next);
  const roundedMilliseconds = precisionRound(milliseconds, 2);

  context.response.set('X-Response-Time', `${roundedMilliseconds}ms`);
}
