import { createErrorResponse, createResultResponse, ErrorResponse, ResultResponse } from '@tstdl/base/api';
import { Logger } from '@tstdl/base/logger';
import { StringMap, UndefinableJson } from '@tstdl/base/types';
import { precisionRound, Timer } from '@tstdl/base/utils';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import { readStream } from '../utils';
import { ValidationFunction } from './validation';
import { noopValidator } from './validation/validators';

type Context = Koa.ParameterizedContext<void, KoaRouter.IRouterParamContext<void, void>>;

export type Parameters = StringMap<string>;

export type BodyPrimitive = string | number | true | false | null;
export type Body = UndefinableJson;

export type GetData<P extends Parameters> = { parameters: P };
export type PostData<P extends Parameters, B extends Body> = GetData<P> & { body: B };

export type GetValidationFunction<P extends Parameters> = ValidationFunction<GetData<P>>;
export type PostValidationFunction<P extends Parameters, B extends Body> = ValidationFunction<PostData<P, B>>;

export type RequestHandler = (request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse) => void;
export type GetFunctionHandler<P extends Parameters, TResult extends UndefinableJson> = (data: GetData<P>) => TResult | Promise<TResult>;
export type PostFunctionHandler<P extends Parameters, B extends Body, TResult extends UndefinableJson> = (data: PostData<P, B>) => TResult | Promise<TResult>;

export type Route = GetRoute<any, any> | PostRoute<any, any, any>;

export type GetRoute<P extends Parameters, TResult extends UndefinableJson> = {
  type: 'get',
  path: string,
  validator: GetValidationFunction<P>,
  handler: GetFunctionHandler<P, TResult>
};

export type PostRoute<P extends Parameters, B extends Body, TResult extends UndefinableJson> = {
  type: 'post',
  path: string,
  validator: PostValidationFunction<P, B>,
  handler: PostFunctionHandler<P, B, TResult>
};

export class HttpApi {
  private readonly logger: Logger;
  private readonly koa: Koa<void, void>;
  private readonly router: KoaRouter<void, void>;
  private readonly requestHandler: RequestHandler;

  constructor({ prefix, logger, behindProxy = false }: { prefix: string, logger: Logger, behindProxy?: boolean }) {
    this.logger = logger;

    this.koa = new Koa();
    this.router = new KoaRouter();

    this.requestHandler = this.koa.callback();

    this.koa.proxy = behindProxy;
    this.router.prefix(prefix);

    this.koa.use(errorCatchMiddleware(logger));
    this.koa.use(responseTimeMiddleware);
    this.koa.use(this.router.routes());
    this.koa.use(this.router.allowedMethods());
  }

  handleRequest(request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse): void {
    this.requestHandler(request, response);
  }

  registerRoutes(routes: Route[]): void {
    for (const route of routes) {
      switch (route.type) {
        case 'get':
          this.registerGetRoute(route.path, route.validator, route.handler);
          break;

        case 'post':
          this.registerPostRoute(route.path, route.validator, route.handler);
          break;

        default:
          throw new Error('unknown route type');
      }
    }
  }

  registerGetRoute<TResult extends UndefinableJson>(path: string, handler: GetFunctionHandler<{}, TResult>): void;
  registerGetRoute<P extends Parameters, TResult extends UndefinableJson>(path: string, validator: GetValidationFunction<P>, handler: GetFunctionHandler<P, TResult>): void;
  registerGetRoute<P extends Parameters, TResult extends UndefinableJson>(path: string, validatorOrHandler: GetValidationFunction<P> | GetFunctionHandler<P, TResult>, handler?: GetFunctionHandler<P, TResult>): void {
    const _validator = typeof handler == 'function' ? validatorOrHandler as GetValidationFunction<P> : noopValidator;
    const _handler = typeof handler == 'function' ? handler : validatorOrHandler as GetFunctionHandler<P, TResult>;

    this.router.get(path, async (context: Context, next) => {
      await this.handle(context, _validator, _handler);
      return next();
    });
  }

  registerPostRoute<B extends Body, TResult extends UndefinableJson>(path: string, validator: PostValidationFunction<{}, B>, handler: PostFunctionHandler<{}, B, TResult>): void;
  registerPostRoute<P extends Parameters, B extends Body, TResult extends UndefinableJson>(path: string, validator: PostValidationFunction<P, B>, handler: PostFunctionHandler<P, B, TResult>): void;
  registerPostRoute<P extends Parameters, B extends Body, TResult extends UndefinableJson>(path: string, validatorOrHandler: PostValidationFunction<P, B> | PostFunctionHandler<P, B, TResult>, handler?: PostFunctionHandler<P, B, TResult>): void {
    const _validator = typeof handler == 'function' ? validatorOrHandler as PostValidationFunction<P, B> : noopValidator;
    const _handler = typeof handler == 'function' ? handler : validatorOrHandler as PostFunctionHandler<P, B, TResult>;

    this.router.post(path, async (context: Context, next) => {
      await this.handle(context, _validator, _handler);
      return next();
    });
  }

  private async handle<P extends Parameters, B extends Body, TResult extends UndefinableJson>(context: Context, validator: GetValidationFunction<P> | PostValidationFunction<P, B>, handler: GetFunctionHandler<P, TResult> | PostFunctionHandler<P, B, TResult>): Promise<void> {
    const { request, response, params } = context;
    const { method, query: { ...query } } = request;

    const parameters = { ...params, ...query };

    let requestData: GetData<P> | PostData<P, B>;

    switch (method) {
      case 'GET':
        requestData = { parameters };
        break;

      case 'POST':
        try {
          const body = await readJsonBody(request);
          requestData = { parameters, body } as PostData<P, B>;
        }
        catch (error) {
          response.status = 400;
          response.body = createErrorResponse((error as Error).name, (error as Error).message);
          return;
        }
        break;

      default:
        throw new Error(`method ${request.method} not supported`);
    }

    const validationResult = method == 'GET'
      ? (validator as GetValidationFunction<P>)(requestData)
      : (validator as PostValidationFunction<P, B>)(requestData as PostData<P, B>);

    if (validationResult.valid) {
      const handlerReturnValue = handler(requestData as PostData<P, B>);
      const result = (handlerReturnValue instanceof Promise) ? await handlerReturnValue : handlerReturnValue;

      (response.body as ResultResponse<TResult>) = createResultResponse(result);
    }
    else {
      response.status = 400;
      response.body = createErrorResponse('invalid request data', validationResult.error);
    }
  }
}

async function readJsonBody(request: Koa.Request, maxLength: number = 10e6): Promise<UndefinableJson> {
  const body = await readBody(request, maxLength);
  const json = JSON.parse(body) as UndefinableJson;
  return json;
}

async function readBody(request: Koa.Request, maxBytes: number): Promise<string> {
  const { req, charset } = request;

  const rawBody = await readStream(req, maxBytes);
  const encoding = (charset != undefined && charset.length > 0) ? charset : 'utf-8';
  const body = rawBody.toString(encoding);

  return body;
}

// tslint:disable-next-line: typedef
function errorCatchMiddleware(logger: Logger) {
  return async function errorCatchMiddleware({ response }: Context, next: () => Promise<any>): Promise<any> {
    try {
      await next();
    }
    catch (error) {
      logger.error(error as Error);

      response.status = 500;
      (response.body as ErrorResponse) = createErrorResponse('500', 'Internal Server Error');
    }
  };
}

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
