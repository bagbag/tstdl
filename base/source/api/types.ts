import type { HttpServerRequest, HttpServerResponse } from '#/http/server/index.js';
import type { HttpMethod } from '#/http/types.js';
import type { SchemaOutput, SchemaTestable } from '#/schema/index.js';
import type { ServerSentEventsSource } from '#/sse/server-sent-events-source.js';
import type { ServerSentEvents } from '#/sse/server-sent-events.js';
import type { NonUndefinable, OneOrMany, Record, ReturnTypeOrT } from '#/types/index.js';
import { objectEntries } from '#/utils/object/object.js';
import { isFunction } from '#/utils/type-guards.js';
import { resolveValueOrProvider, type ValueOrProvider } from '#/utils/value-or-provider.js';
import type { ApiGatewayMiddlewareContext } from './server/index.js';

export type ApiRegistrationOptions = {
  name?: string,
  prefix?: string,
};

export type ApiRegistration = {
  target: object,
  name: string,
  path: string,
  prefix: string,
};

export type EndpointRegistrationOptions = {
  path?: string,
  description?: string,
};

export type ApiEndpointMethod = HttpMethod;

export type ApiEndpointDefinitionParameters = SchemaTestable;
export type ApiEndpointDefinitionBody = SchemaTestable | typeof String | typeof Uint8Array | typeof Blob | typeof ReadableStream;
export type ApiEndpointDefinitionResult = SchemaTestable | typeof String | typeof Uint8Array | typeof Blob | typeof ReadableStream;

export type ApiEndpointDataProvider<T> = T | ((request: HttpServerRequest, context: ApiGatewayMiddlewareContext) => T | Promise<T>);

export type ApiEndpointDefinitionCors = {
  accessControlAllowCredentials?: ApiEndpointDataProvider<boolean | undefined>,
  accessControlAllowHeaders?: ApiEndpointDataProvider<OneOrMany<string> | undefined>,
  accessControlAllowMethods?: ApiEndpointDataProvider<OneOrMany<HttpMethod> | undefined>,
  accessControlAllowOrigin?: ApiEndpointDataProvider<string | undefined>,
  autoAccessControlAllowOrigin?: ApiEndpointDataProvider<OneOrMany<string> | undefined>,
  accessControlExposeHeaders?: ApiEndpointDataProvider<OneOrMany<string> | undefined>,
  accessControlMaxAge?: ApiEndpointDataProvider<number | undefined>,
};

export type ApiEndpointDefinition = {
  /**
   * Http Method
   * @default GET
   */
  method?: OneOrMany<ApiEndpointMethod>,

  /** Endpoint prefix. Overwrites default from api and gateway. */
  prefix?: string | null,

  /** Root resource path. Overwrites default from {@link ApiDefinition}. */
  rootResource?: string | null,

  /**
   * Sub resource in api
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

  /** Maximum size of request body. Useful to prevent harmful requests. */
  maxBytes?: number,
  description?: string,
  data?: Record,

  /**
   * If true, sets browsers fetch to { credentials: 'include' } and enables 'Access-Control-Allow-Credentials' header.
   *
   * @default false
   */
  credentials?: boolean,

  cors?: ApiEndpointDefinitionCors,
};

export type ApiEndpointsDefinition = Record<string, ValueOrProvider<ApiEndpointDefinition>>;

export type ApiDefinition<Resource extends string = string, Endpoints extends ApiEndpointsDefinition = ApiEndpointsDefinition> = {
  /**
   * Default root resource for endpoints.
   */
  resource: Resource,

  /**
   * Endpoint prefix. Overwrites default from gateway.
   */
  prefix?: string | null,

  endpoints: Endpoints,
};

export type ApiEndpointKeys<T extends ApiDefinition> = Extract<keyof T['endpoints'], string>;
export type NormalizedApiEndpoints<T extends ApiDefinition['endpoints']> = { [P in keyof T]: ReturnTypeOrT<T[P]> };
export type ApiEndpoint<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NormalizedApiEndpoints<T['endpoints']>[K];

export type ApiEndpointParametersSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['parameters']>;
export type ApiEndpointBodySchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['body']>;
export type ApiEndpointResultSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['result']>;

export type ApiBinaryType = typeof Uint8Array | typeof Blob | typeof ReadableStream<any>;

export type ApiInputType<T extends SchemaTestable> =
  | T extends ApiBinaryType ? InstanceType<ApiBinaryType>
  : T extends typeof ServerSentEvents ? ServerSentEventsSource
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
  request: HttpServerRequest,
};

export type ApiRequestContext<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> = ApiRequestData<T, K> & {
  getToken<Token>(): Promise<Token>,
};

export type ApiEndpointServerImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  (context: ApiRequestContext<T, K>) => ApiServerResult<T, K> | Promise<ApiServerResult<T, K>>;

export type ApiEndpointClientImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  ApiClientBody<T, K> extends never
  ? ApiParameters<T, K> extends never
  ? () => Promise<ApiClientResult<T, K>>
  : (parameters: ApiParameters<T, K>) => Promise<ApiClientResult<T, K>>
  : (parameters: ApiParameters<T, K> extends never ? undefined | Record<never, never> : ApiParameters<T, K>, body: ApiClientBody<T, K>) => Promise<ApiClientResult<T, K>>;

export type ApiController<T extends ApiDefinition = any> = {
  [P in ApiEndpointKeys<T>]: ApiEndpointServerImplementation<T, P>
};

export type ApiClientImplementation<T extends ApiDefinition = any> =
  { [P in ApiEndpointKeys<T>]: ApiEndpointClientImplementation<T, P> }
  & {
    getEndpointResource<E extends ApiEndpointKeys<T>>(endpoint: E, parameters?: ApiParameters<T, E>): string,
    getEndpointUrl<E extends ApiEndpointKeys<T>>(endpoint: E, parameters?: ApiParameters<T, E>): string,
  };

export function defineApi<T extends ApiDefinition>(definition: T): T {
  return definition;
}

export async function resolveApiEndpointDataProvider<T>(request: HttpServerRequest, context: ApiGatewayMiddlewareContext, provider: ApiEndpointDataProvider<T>): Promise<T> {
  if (isFunction(provider)) {
    return await provider(request, context);
  }

  return provider;
}

export function normalizedApiDefinitionEndpoints<T extends ApiDefinition['endpoints']>(apiDefinitionEndpoints: T): NormalizedApiEndpoints<T> {
  const entries = normalizedApiDefinitionEndpointsEntries(apiDefinitionEndpoints);
  return Object.fromEntries(entries) as NormalizedApiEndpoints<T>;
}

export function normalizedApiDefinitionEndpointsEntries<T extends ApiDefinition['endpoints']>(apiDefinition: T): [keyof T, ApiEndpointDefinition][] {
  return objectEntries(apiDefinition).map(([key, def]): [string, ApiEndpointDefinition] => [key as string, resolveValueOrProvider(def)]);
}
