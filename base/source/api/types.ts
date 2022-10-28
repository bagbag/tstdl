import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { HttpMethod } from '#/http/types';
import type { SchemaOutput, SchemaTestable } from '#/schema';
import type { NonUndefinable, OneOrMany, Record, ReturnTypeOrT } from '#/types';
import { objectEntries } from '#/utils/object/object';
import { isFunction } from '#/utils/type-guards';
import type { ApiGatewayMiddlewareContext } from './server';

export type ApiRegistrationOptions = {
  name?: string,
  prefix?: string
};

export type ApiRegistration = {
  target: object,
  name: string,
  path: string,
  prefix: string
};

export type EndpointRegistrationOptions = {
  path?: string,
  description?: string
};

export type ApiEndpointMethod = HttpMethod;

export type ApiEndpointDefinitionParameters = SchemaTestable;
export type ApiEndpointDefinitionBody = SchemaTestable | typeof String | typeof Uint8Array | typeof Blob | typeof ReadableStream;
export type ApiEndpointDefinitionResult = SchemaTestable | typeof String | typeof Uint8Array | typeof Blob | typeof ReadableStream;

export type ApiEndpointDataProvider<T> = T | ((request: HttpServerRequest, context: ApiGatewayMiddlewareContext) => T | Promise<T>);

export type ApiEndpointDefinitionCors = {
  accessControlAllowCredentials?: ApiEndpointDataProvider<boolean>,
  accessControlAllowHeaders?: ApiEndpointDataProvider<OneOrMany<string>>,
  accessControlAllowMethods?: ApiEndpointDataProvider<OneOrMany<HttpMethod>>,
  accessControlAllowOrigin?: ApiEndpointDataProvider<string>,
  accessControlExposeHeaders?: ApiEndpointDataProvider<OneOrMany<string>>,
  accessControlMaxAge?: ApiEndpointDataProvider<number>
};

export type ApiEndpointDefinition = {
  /**
   * Http Method
   * @default GET
   */
  method?: OneOrMany<ApiEndpointMethod>,

  /**
   * Endpoint prefix. Overwrites default from api and gateway.
   */
  prefix?: string | null,

  /**
   * Root resource path. Overwrites default from {@link ApiDefinition}.
   */
  rootResource?: string | null,

  /**
   * sub resource in api
   *
   * results in
   * ```ts
   * ${endpoint.rootResource ?? api.ressource}/${endpoint.resource}
   * ```
   * @default name of endpoint property
   */
  resource?: string,

  version?: OneOrMany<number | null>,
  parameters?: ApiEndpointDefinitionParameters,
  body?: ApiEndpointDefinitionBody,
  result?: ApiEndpointDefinitionResult,

  /**
   * Maximum size of request body. Useful to prevent harmful requests.
   */
  maxBytes?: number,
  description?: string,
  data?: any,
  cors?: ApiEndpointDefinitionCors
};

export type ApiDefinition = {
  /**
   * Default root resource for endpoints.
   */
  resource: string,

  /**
   * Endpoint prefix. Overwrites default from gateway.
   */
  prefix?: string | null,

  endpoints: Record<string, ApiEndpointDefinition | (() => ApiEndpointDefinition)>
};

export type ApiEndpointKeys<T extends ApiDefinition> = keyof T['endpoints'];
export type NormalizedApiEndpoints<T extends ApiDefinition['endpoints']> = { [P in keyof T]: ReturnTypeOrT<T[P]> };
export type ApiEndpoint<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NormalizedApiEndpoints<T['endpoints']>[K];

export type ApiEndpointParametersSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['parameters']>;
export type ApiEndpointBodySchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['body']>;
export type ApiEndpointResultSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['result']>;

export type ApiBinaryType = typeof Uint8Array | typeof Blob | typeof ReadableStream;

export type ApiInputType<T extends SchemaTestable> =
  | T extends ApiBinaryType ? (Uint8Array | Blob | ReadableStream<Uint8Array>)
  : T extends SchemaTestable ? SchemaOutput<T> : never;

export type ApiOutputType<T extends SchemaTestable> =
  | T extends typeof ReadableStream ? ReadableStream<Uint8Array>
  : T extends SchemaTestable ? SchemaOutput<T> : never;

export type ApiParameters<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiInputType<ApiEndpointParametersSchema<T, K>>;

export type ApiClientBody<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiInputType<ApiEndpointBodySchema<T, K>>;

export type ApiServerBody<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiOutputType<ApiEndpointBodySchema<T, K>>;

export type ApiServerResult<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiInputType<ApiEndpointResultSchema<T, K>> | HttpServerResponse;

export type ApiClientResult<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiOutputType<ApiEndpointResultSchema<T, K>>;

export type ApiRequestData<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> = {
  parameters: ApiParameters<T, K>,
  body: ApiServerBody<T, K>,
  request: HttpServerRequest
};

export type ApiEndpointServerImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  (requestData: ApiRequestData<T, K>) => ApiServerResult<T, K> | Promise<ApiServerResult<T, K>>;

export type ApiEndpointClientImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  ApiClientBody<T, K> extends never
  ? ApiParameters<T, K> extends never
  ? () => Promise<ApiClientResult<T, K>>
  : (parameters: ApiParameters<T, K>) => Promise<ApiClientResult<T, K>>
  : (parameters: ApiParameters<T, K> extends never ? undefined | Record<never, never> : ApiParameters<T, K>, body: ApiClientBody<T, K>) => Promise<ApiClientResult<T, K>>;

export type ApiController<T extends ApiDefinition = any> = {
  [P in ApiEndpointKeys<T>]: ApiEndpointServerImplementation<T, P>
};

export type ApiClientImplementation<T extends ApiDefinition = any> = {
  [P in ApiEndpointKeys<T>]: ApiEndpointClientImplementation<T, P>
};

export function defineApi<T extends ApiDefinition>(definition: T): T {
  return definition;
}

export async function resolveApiEndpointDataProvider<T>(request: HttpServerRequest, context: ApiGatewayMiddlewareContext, provider: ApiEndpointDataProvider<T>): Promise<T> {
  if (isFunction(provider)) {
    return provider(request, context);
  }

  return provider;
}

export function normalizedApiDefinitionEndpoints<T extends ApiDefinition['endpoints']>(apiDefinitionEndpoints: T): NormalizedApiEndpoints<T> {
  const entries = normalizedApiDefinitionEndpointsEntries(apiDefinitionEndpoints);
  return Object.fromEntries(entries) as NormalizedApiEndpoints<T>;
}

export function normalizedApiDefinitionEndpointsEntries<T extends ApiDefinition['endpoints']>(apiDefinition: T): [keyof T, ApiEndpointDefinition][] {
  return objectEntries(apiDefinition).map(([key, def]): [string, ApiEndpointDefinition] => [key as string, isFunction(def) ? def() : def]);
}
