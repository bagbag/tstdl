import { createErrorResponse, createResultResponse, ResultResponse } from '@common-ts/base/api';
import { Logger } from '@common-ts/base/logger';
import { StringMap } from '@common-ts/base/types';
import { precisionRound, Timer } from '@common-ts/base/utils';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import { readStream } from '../utils';
import { ValidationFunction } from './validation';

type Context = Koa.ParameterizedContext<void, KoaRouter.IRouterParamContext<void, void>>;

export type Query = StringMap<string>;
export type Parameters = StringMap<string>;

export type BodyPrimitive = string | number | true | false | null;
export type Body = BodyPrimitive | StringMap<BodyPrimitive> | BodyPrimitive[];

export type GetData<Q extends Query, P extends Parameters> = { query: Q, parameters: P };
export type PostData<Q extends Query, P extends Parameters, B extends Body> = GetData<Q, P> & { body: B };

export type GetValidationFunction<Q extends Query, P extends Parameters> = ValidationFunction<GetData<Q, P>>;
export type PostValidationFunction<Q extends Query, P extends Parameters, B extends Body> = ValidationFunction<PostData<Q, P, B>>;

export type RequestHandler = (request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse) => void;
export type GetFunctionHandler<Q extends Query, P extends Parameters, TResult> = (data: GetData<Q, P>) => TResult | Promise<TResult>;
export type PostFunctionHandler<Q extends Query, P extends Parameters, B extends Body, TResult> = (data: PostData<Q, P, B>) => TResult | Promise<TResult>;

export class HttpApi {
  private readonly logger: Logger;
  private readonly koa: Koa<void, void>;
  private readonly router: KoaRouter<void, void>;
  private readonly requestHandler: RequestHandler;

  constructor({ prefix, logger, behindProxy }: { prefix: string, logger: Logger, behindProxy?: boolean | undefined }) {
    this.logger = logger;

    this.koa = new Koa();
    this.router = new KoaRouter();

    this.requestHandler = this.koa.callback();

    this.koa.proxy = (behindProxy === true);
    this.router.prefix(prefix);

    this.koa.use(errorCatchMiddleware(logger));
    this.koa.use(responseTimeMiddleware);
    this.koa.use(this.router.routes());
    this.koa.use(this.router.allowedMethods());
  }

  handleRequest(request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse): void {
    this.requestHandler(request, response);
  }

  registerGetRoute<Q extends Query, P extends Parameters, TResult>(path: string, validator: GetValidationFunction<Q, P>, handler: GetFunctionHandler<Q, P, TResult>): void {
    this.router.get(path, async (context: Context, next) => {
      await this.handle(context, validator, handler);
      return next();
    });
  }

  registerPostRoute<Q extends Query, P extends Parameters, B extends Body, TResult>(path: string, validator: PostValidationFunction<Q, P, B>, handler: PostFunctionHandler<Q, P, B, TResult>): void {
    this.router.post(path, async (context: Context, next) => {
      await this.handle(context, validator, handler);
      return next();
    });
  }

  private async handle<Q extends Query, P extends Parameters, B extends Body, TResult>(context: Context, validator: GetValidationFunction<Q, P> | PostValidationFunction<Q, P, B>, handler: GetFunctionHandler<Q, P, TResult> | PostFunctionHandler<Q, P, B, TResult>): Promise<void> {
    const { request, response, params: parameters } = context;
    const { method, query: { ...query } } = request;

    let requestData: GetData<Q, P> | PostData<Q, P, B>;

    switch (method) {
      case 'GET':
        requestData = { query, parameters };
        break;

      case 'POST':
        try {
          const body = await readJsonBody(request);
          requestData = { query, parameters, body };
        }
        catch (error) {
          response.status = 400;
          response.body = createErrorResponse((error as Error).message);
          return;
        }
        break;

      default:
        throw new Error(`method ${request.method} not supported`);
    }

    const validationResult = method == 'GET'
      ? (validator as GetValidationFunction<Q, P>)(requestData)
      : (validator as PostValidationFunction<Q, P, B>)(requestData as PostData<Q, P, B>);

    if (validationResult.valid) {
      const handlerReturnValue = handler(requestData as PostData<Q, P, B>);
      const result = (handlerReturnValue instanceof Promise) ? await handlerReturnValue : handlerReturnValue;

      (response.body as ResultResponse<TResult>) = createResultResponse(result);
    }
    else {
      response.status = 400;
      response.body = createErrorResponse('invalid request data', validationResult.error);
    }
  }
}

async function readJsonBody(request: Koa.Request, maxLength: number = 10e6): Promise<unknown> {
  const body = await readBody(request, maxLength);
  const json = JSON.parse(body) as unknown;
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
      response.body = createErrorResponse('server error', { name: (error as Error).name, message: (error as Error).message });
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
