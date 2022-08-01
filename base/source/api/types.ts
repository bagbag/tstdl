import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { HttpMethod } from '#/http/types';
import type { ObjectSchemaDefinition, ObjectSchemaValidator, SchemaOutput, SchemaValidator, StringSchemaDefinition, StringSchemaValidator, Uint8ArraySchemaValidator, UnionSchemaValidator } from '#/schema';
import type { NonUndefinable, OneOrMany, Record, ReturnTypeOrT } from '#/types';
import { isFunction } from '#/utils/type-guards';
import type { ApiGatewayMiddlewareContext } from './server';

export const rootResource = '$';

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

export type ApiEndpointDefinitionBody = StringSchemaValidator | ObjectSchemaValidator<any> | Uint8ArraySchemaValidator | UnionSchemaValidator<StringSchemaDefinition | ObjectSchemaDefinition<any>, (StringSchemaDefinition | ObjectSchemaDefinition<any>)[]>;
export type ApiEndpointDefinitionResult = SchemaValidator;

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
  method?: OneOrMany<ApiEndpointMethod>,
  resource?: typeof rootResource | string,
  version?: OneOrMany<number | null>,
  parameters?: ObjectSchemaValidator<any>,
  body?: ApiEndpointDefinitionBody,
  result?: ApiEndpointDefinitionResult,
  description?: string,
  data?: any,
  cors?: ApiEndpointDefinitionCors
};

export type ApiDefinition = {
  resource: string,
  endpoints: Record<string, ApiEndpointDefinition | (() => ApiEndpointDefinition)>
};

export type ApiEndpointKeys<T extends ApiDefinition> = keyof T['endpoints'];
export type NormalizedApiEndpoints<T extends ApiDefinition['endpoints']> = { [P in keyof T]: ReturnTypeOrT<T[P]> };
export type ApiEndpoint<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NormalizedApiEndpoints<T['endpoints']>[K];

export type ApiEndpointParametersSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['parameters']>['schema'];
export type ApiEndpointBodySchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['body']>['schema'];
export type ApiEndpointResultSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['result']>['schema'];

/**
 * @deprecated Use {@link ApiParameters} instead
 */
export type ApiEndpointParametersOutput<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiParameters<T, K>;
export type ApiParameters<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaOutput<ApiEndpointParametersSchema<T, K>>;

/**
 * @deprecated Use {@link ApiBody} instead
 */
export type ApiEndpointBody<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiBody<T, K>;
export type ApiBody<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaOutput<ApiEndpointBodySchema<T, K>>;

/**
 * @deprecated Use {@link ApiServerResult} instead
 */
export type ApiEndpointServerResultType<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiServerResult<T, K>;
export type ApiServerResult<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaOutput<ApiEndpointResultSchema<T, K>> | HttpServerResponse;

/**
 * @deprecated Use {@link ApiClientResult} instead
 */
export type ApiEndpointClientResultType<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = ApiClientResult<T, K>;
export type ApiClientResult<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaOutput<ApiEndpointResultSchema<T, K>>;

/**
 * @deprecated Use {@link ApiRequestData} instead
 */
export type ApiEndpointServerRequestData<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> = ApiRequestData<T, K>;
export type ApiRequestData<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> = {
  parameters: ApiParameters<T, K>,
  body: ApiBody<T, K>,
  request: HttpServerRequest
};

export type ApiEndpointServerImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  (requestData: ApiRequestData<T, K>) => ApiServerResult<T, K> | Promise<ApiServerResult<T, K>>;

export type ApiEndpointClientImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  ApiBody<T, K> extends never
  ? ApiParameters<T, K> extends never
  ? () => Promise<ApiClientResult<T, K>>
  : (parameters: ApiParameters<T, K>) => Promise<ApiClientResult<T, K>>
  : (parameters: ApiParameters<T, K>, body: ApiBody<T, K>) => Promise<ApiClientResult<T, K>>;

/**
 * @deprecated Use {@link ApiController} instead
 */
export type ApiControllerImplementation<T extends ApiDefinition = any> = ApiController<T>;

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
  return Object.entries(apiDefinition).map(([key, def]): [string, ApiEndpointDefinition] => [key, isFunction(def) ? def() : def]);
}
