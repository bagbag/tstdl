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
import { ValidationFunction } from './validation';
import { ValidationError } from './validation/error';
import { noopValidator } from './validation/validators';

type Context = Koa.ParameterizedContext<void, KoaRouter.RouterParamContext<void, void>>;

export type HttpRequest = {
  url: URL,
  method: string,
  ip: string,
  headers: StringMap<string | string[]>
};

export type HttpResponse<JsonType extends UndefinableJson = {}> = {
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

export type GetValidationFunction<Parameters = GetData> = ValidationFunction<GetData, Parameters>;
export type PostValidationFunction<B extends BodyType, Parameters = PostData<BodyType>> = ValidationFunction<PostData<B>, Parameters>;

export type RequestHandler = (request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse) => void;

export type RouteHandler<Data> = (data: Data, request: HttpRequest) => HttpResponse | Promise<HttpResponse>;

export type Route = GetRoute | ValidatedGetRoute<any> | PostRoute<BodyType> | ValidatedPostRoute<BodyType, any>;

type RouteBase<Type extends 'get' | 'post', HandlerParameters> = {
  type: Type,
  path: string,
  handler: RouteHandler<HandlerParameters>
};

type ValidatedRouteBase<Type extends 'get' | 'post', Input, HandlerParameters, Validator extends ValidationFunction<Input, HandlerParameters>> = RouteBase<Type, HandlerParameters> & {
  validator: Validator
}

export type GetRoute = RouteBase<'get', GetData>;

export type ValidatedGetRoute<Parameters = GetData> = ValidatedRouteBase<'get', GetData, Parameters, GetValidationFunction<Parameters>>;

export type PostRoute<B extends BodyType> = RouteBase<'post', PostData<B>> & {
  bodyType: B
};

export type ValidatedPostRoute<B extends BodyType, Parameters = PostData<BodyType>> = ValidatedRouteBase<'post', PostData<B>, Parameters, PostValidationFunction<B, Parameters>> & {
  bodyType: B
};

export class HttpApi {
  private readonly logger: Logger;
  private readonly koa: Koa<void, void>;
  private readonly router: KoaRouter<void, void>;
  private readonly requestHandler: RequestHandler;
  private readonly supressedErrors: Set<Type<Error>>;

  constructor({ prefix, logger, behindProxy = false }: { prefix: string, logger: Logger, behindProxy?: boolean }) {
    this.logger = logger;

    this.koa = new Koa();
    this.router = new KoaRouter();
    this.supressedErrors = new Set<Type<Error>>();

    this.requestHandler = this.koa.callback();

    this.koa.proxy = behindProxy;
    this.router.prefix(prefix);

    this.koa.use(errorCatchMiddleware(logger, this.supressedErrors));
    this.koa.use(responseTimeMiddleware);
    this.koa.use(this.router.routes());
    this.koa.use(this.router.allowedMethods());
  }

  handleRequest(request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse): void {
    this.requestHandler(request, response);
  }

  supressErrorLog(errorConstructor: Type<Error>): void {
    this.supressedErrors.add(errorConstructor);
  }

  registerRoutes(routes: Route[]): void {
    for (const route of routes) {
      const validator = isValidatedRoute(route) ? route.validator as ValidationFunction<any, any> : noopValidator;

      switch (route.type) {
        case 'get':
          this.registerGetRoute(route.path, validator, route.handler);
          break;

        case 'post':
          this.registerPostRoute(route.path, (route as PostRoute<BodyType>).bodyType, validator, route.handler);
          break;

        default:
          throw new Error('unknown route type');
      }
    }
  }

  registerGetRoute<Parameters = GetData>(path: string, validator: GetValidationFunction<Parameters>, handler: RouteHandler<Parameters>): void {
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

    const validationResult = method == 'GET'
      ? (validator as GetValidationFunction<Parameters>)(requestData)
      : (validator as PostValidationFunction<B, Parameters>)(requestData as PostData<B>);

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

  if (responseResult.json != undefined) {
    response.body = responseResult.json;
  }

  if (responseResult.text != undefined) {
    response.body = responseResult.text;
  }

  if (responseResult.stream != undefined) {
    response.body = responseResult.stream;
  }

  if (responseResult.binary != undefined) {
    response.body = responseResult.binary;
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

function isValidatedRoute(route: Route): route is ValidatedRouteBase<any, any, any, any> {
  return typeof (route as ValidatedRouteBase<any, any, any, any>).validator == 'function';
}
