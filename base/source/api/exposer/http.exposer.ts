import type { HttpBodyType } from '#/http';
import type { UndefinableJson } from '#/types';
import type { EndpointHandler } from '../endpoint';
import type { HttpMethod, HttpRequest, HttpResponse } from '../http-api';

export type HttpHandler<RequestBodyType extends HttpBodyType, ResponseJsonBodyType extends UndefinableJson, EndpointParameters, EndpointResult, EndpointContext> =
  (request: HttpRequest<RequestBodyType>, endpoint: EndpointHandler<EndpointParameters, EndpointResult, EndpointContext>) => HttpResponse<ResponseJsonBodyType> | Promise<HttpResponse<ResponseJsonBodyType>>;

export type HttpExpose<RequestBodyType extends HttpBodyType, ResponseJsonBodyType extends UndefinableJson, EndpointParameters, EndpointResult, EndpointContext> = {
  /**
   * url the endpoint will be exposed at
   */
  url: string | RegExp,

  /**
   * http methods the endpoint will be exposed for
   */
  method: HttpMethod | HttpMethod[],

  /**
   * request body type
   */
  bodyType?: RequestBodyType,

  /**
   * limits the request body size as a measure against malicious requests (for example to prevent parsing of huge json objects)
   */
  maxRequestBodyBytes?: number,

  /**
   * request handler - responsible for calling the endpoint and creating the response
   */
  handler: HttpHandler<RequestBodyType, ResponseJsonBodyType, EndpointParameters, EndpointResult, EndpointContext>
};
