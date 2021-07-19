import { HttpBodyType } from '#/http';
import type { OneOrMany, UndefinableJson } from '#/types';
import { assertNumberPass, assertStringPass, _throw } from '#/utils';
import type { HttpExpose } from './exposer';
import { HttpMethod } from './http-api';

export type EndpointHandler<Parameters, Result, Context> = (parameters: Parameters, context: Context) => Result | Promise<Result>;
export type Transformer<Input, Output> = (input: Input) => Output | Promise<Output>;
export type Tapper<Input, Context> = (input: Input, context: Context) => void | Promise<void>;
export type Authorizer<T, EndpointContext> = (value: T, authorization: EndpointContext) => any | Promise<any>;

export const noopTransformer = <T>(data: T): T => data;

export function createResultAuthorizedEndpointHandler<Parameters, Result, Context>(authorizer: Authorizer<Result, Context>, handler: EndpointHandler<Parameters, Result, Context>): EndpointHandler<Parameters, Result, Context> {
  async function resultAuthorizedEndpointHandler(parameters: Parameters, context: Context): Promise<Result> {
    const result = await handler(parameters, context);
    await authorizer(result, context);

    return result;
  }

  return resultAuthorizedEndpointHandler;
}

export type Endpoint<Parameters, Result, Context> = {
  /**
   * endpoint handler
   */
  handler: EndpointHandler<Parameters, Result, Context>,

  /**
   * expose the endpoint via http
   */
  http?: OneOrMany<HttpExpose<HttpBodyType, any, Parameters, Result, Context>>
};

export type HandlerBuilder<Parameters = any, Result = any, Context = any, NextParameters = any, NextResult = any> = (next: EndpointHandler<NextParameters, NextResult, Context>) => EndpointHandler<Parameters, Result, Context>;

export class EndpointBuilder<TargetParameters, TargetResult extends UndefinableJson, Context, NextParameters = TargetParameters, CurrentResult = unknown> implements Endpoint<TargetParameters, CurrentResult, Context> {
  private readonly handlerBuilders: HandlerBuilder[];

  readonly http: HttpExpose<HttpBodyType, TargetResult, TargetParameters, CurrentResult, Context>[];

  readonly handler: EndpointHandler<TargetParameters, CurrentResult, Context>;

  constructor(handlerBuilders: HandlerBuilder[] = []) {
    this.handlerBuilders = handlerBuilders;

    let _handler: EndpointHandler<any, any, Context> = (value: unknown) => value;

    for (let i = this.handlerBuilders.length - 1; i >= 0; i--) {
      _handler = this.handlerBuilders[i]!(_handler);
    }

    this.handler = _handler;

    this.http = [];
  }

  /**
   * transforms the parameters before being passed to next handler
   *
   * can be used for example to validate and coerce data
   */
  transform<TransformedParameters>(transformer: Transformer<NextParameters, TransformedParameters>): EndpointBuilder<TargetParameters, TargetResult, Context, TransformedParameters, TransformedParameters> {
    return this.handle((parameters) => transformer(parameters));
  }

  /**
   * calls the tapper with the current value
   *
   * can be used for example to validate, authorize, log
   */
  tap(tapper: Tapper<NextParameters, Context>): EndpointBuilder<TargetParameters, TargetResult, Context, NextParameters, NextParameters> {
    return this.handle(async (parameters, context) => {
      await tapper(parameters, context);
      return parameters;
    });
  }

  /**
   * use the return value of the handler as the endpoint result
   */
  handle<HandlerResult>(handler: EndpointHandler<NextParameters, HandlerResult, Context>): EndpointBuilder<TargetParameters, TargetResult, Context, HandlerResult, HandlerResult> {
    function getEndpointHandler(next: EndpointHandler<HandlerResult, HandlerResult, Context>): EndpointHandler<HandlerResult, HandlerResult, Context> {
      return async function endpointHandler(parameters: any, context: Context): Promise<HandlerResult> {
        const result = await handler(parameters as NextParameters, context);
        return next(result, context);
      };
    }

    return new EndpointBuilder([...this.handlerBuilders, getEndpointHandler]);
  }

  exposeHttp<B extends HttpBodyType>(exposer: HttpExpose<B, TargetResult, TargetParameters, CurrentResult, Context>): this {
    this.http.push(exposer);
    return this;
  }
}

/**
 * build a new endpoint
 */
export function endpoint<Parameters, Result extends UndefinableJson, Context = never>(): EndpointBuilder<Parameters, Result, Context> { // eslint-disable-line @typescript-eslint/no-shadow
  return new EndpointBuilder();
}

const x = endpoint<unknown, number, boolean>()
  .transform(assertStringPass)
  .transform(parseFloat)
  .transform(assertNumberPass)
  .handle((param) => param == 6)
  .handle((param) => Number(param) * 12)
  .tap((value) => (value != 12 ? _throw(new Error('only 12 allowed')) : undefined))
  .exposeHttp({
    url: 'foo',
    method: HttpMethod.Get,
    bodyType: HttpBodyType.Json,
    maxRequestBodyBytes: 5 * 1e6,
    handler: async (request, endpoint) => ({
      statusCode: 200,
      statusMessage: '',
      body: {
        json: await endpoint(request.body, true)
      }
    })
  });
