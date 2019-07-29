import { createErrorResponse, createResultResponse, ErrorResponse, ResultResponse } from '@tstdl/base/api';
import { Logger } from '@tstdl/base/logger';
import { StringMap, UndefinableJson } from '@tstdl/base/types';
import { precisionRound, Timer } from '@tstdl/base/utils';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import { Readable } from 'stream';
import { readStream } from '../utils';
import { ValidationFunction } from './validation';

type Context = Koa.ParameterizedContext<void, KoaRouter.IRouterParamContext<void, void>>;

export type HttpResponse<JsonType extends UndefinableJson = {}> = {
  headers?: StringMap<string | string[]>,
  text?: string,
  json?: JsonType,
  stream?: Readable
};

export type Parameters = StringMap<string>;

export type BodyPrimitive = string | number | true | false | null;
export type Body = UndefinableJson;

export type GetData<P extends object> = { parameters: P };
export type PostData<P extends object, B extends Body> = GetData<P> & { body: B };

export type GetFunctionHandlerData<P> = { parameters: P };
export type PostFunctionHandlerData<P, B extends Body> = GetFunctionHandlerData<P> & { body: B };

export type GetValidationFunction<P extends Parameters, ParsedParameters = P> = ValidationFunction<GetData<P>, ParsedParameters>;
export type PostValidationFunction<P extends Parameters, B extends Body, ParsedParameters = P> = ValidationFunction<PostData<P, B>, ParsedParameters>;

export type RequestHandler = (request: IncomingMessage | Http2ServerRequest, response: ServerResponse | Http2ServerResponse) => void;
export type GetFunctionHandler<P, Response extends HttpResponse> = (data: GetFunctionHandlerData<P>) => Response | Promise<Response>;
export type PostFunctionHandler<P, B extends Body, Response extends HttpResponse> = (data: PostFunctionHandlerData<P, B>) => Response | Promise<Response>;

export type Route = GetRoute<any, any, any> | PostRoute<any, any, any, any>;

export type GetRoute<P extends Parameters, Response extends HttpResponse, ParsedParameters = P> = {
  type: 'get',
  path: string,
  validator: GetValidationFunction<P, ParsedParameters>,
  handler: GetFunctionHandler<ParsedParameters, Response>
};

export type PostRoute<P extends Parameters, B extends Body, Response extends HttpResponse, ParsedParameters = P> = {
  type: 'post',
  path: string,
  validator: PostValidationFunction<P, B, ParsedParameters>,
  handler: PostFunctionHandler<ParsedParameters, B, Response>
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

  registerGetRoute<P extends Parameters, Response extends HttpResponse, ParsedParameters extends object = P>(path: string, validator: GetValidationFunction<P, ParsedParameters>, handler: GetFunctionHandler<ParsedParameters, Response>): void {
    this.router.get(path, async (context: Context, next) => {
      await this.handle(context, validator, handler);
      return next();
    });
  }

  registerPostRoute<P extends Parameters, B extends Body, Response extends HttpResponse, ParsedParameters extends object = P>(path: string, validator: PostValidationFunction<P, B, ParsedParameters>, handler: PostFunctionHandler<ParsedParameters, B, Response>): void {
    this.router.post(path, async (context: Context, next) => {
      await this.handle(context, validator, handler);
      return next();
    });
  }

  private async handle<P extends Parameters, B extends Body, Response extends HttpResponse, ParsedParameters extends object = P>(context: Context, validator: GetValidationFunction<P, ParsedParameters> | PostValidationFunction<P, B, ParsedParameters>, handler: GetFunctionHandler<ParsedParameters, Response> | PostFunctionHandler<ParsedParameters, B, Response>): Promise<void> {
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
      ? (validator as GetValidationFunction<P, ParsedParameters>)(requestData)
      : (validator as PostValidationFunction<P, B, ParsedParameters>)(requestData as PostData<P, B>);

    if (validationResult.valid) {
      const parsedRequestData = {
        ...requestData,
        parameters: validationResult.value
      };

      const handlerReturnValue = handler(parsedRequestData as PostData<ParsedParameters, B>);
      const responseResult = (handlerReturnValue instanceof Promise) ? await handlerReturnValue : handlerReturnValue;

      if (responseResult.headers != undefined) {
        for (const [field, value] of Object.entries(responseResult.headers)) {
          response.set(field, value);
        }
      }

      if (responseResult.json != undefined) {
        (response.body as ResultResponse<UndefinableJson>) = createResultResponse(responseResult.json);
      }
      if (responseResult.text != undefined) {
        response.body = responseResult.text;
      }
      if (responseResult.stream != undefined) {
        response.body = responseResult.stream;
      }
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
