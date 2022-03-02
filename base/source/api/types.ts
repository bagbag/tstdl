import type { HttpServerRequest, HttpServerResponse } from '#/http/server';
import type { HttpMethod } from '#/http/types';
import type { ObjectSchemaValidator, SchemaInput, SchemaOutput, SchemaValidator, StringSchemaValidator, Uint8ArraySchemaValidator } from '#/schema';
import type { NonUndefinable, OneOrMany, Record } from '#/types';

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

const registeredApis: Map<ApiDefinition, ApiControllerImplementation | ApiImplementationFactory> = new Map();

export type ApiEndpointMethod = HttpMethod;

export type ApiEndpointDefinitionBody = StringSchemaValidator | ObjectSchemaValidator<any> | Uint8ArraySchemaValidator;
export type ApiEndpointDefinitionResult = SchemaValidator;

export type ApiEndpointDefinition = {
  method?: ApiEndpointMethod,
  resource?: typeof rootResource | string,
  version?: OneOrMany<number | null>,
  parameters?: ObjectSchemaValidator<any>,
  body?: ApiEndpointDefinitionBody,
  result?: ApiEndpointDefinitionResult,
  description?: string,
  data?: any,
  cors?: {
    accessControlAllowCredentials?: boolean,
    accessControlAllowHeaders?: OneOrMany<string>,
    accessControlAllowMethods?: OneOrMany<HttpMethod>,
    accessControlAllowOrigin?: string,
    accessControlExposeHeaders?: OneOrMany<string>,
    accessControlMaxAge?: number
  }
};

export type ApiDefinition = {
  resource: string,
  endpoints: Record<string, ApiEndpointDefinition>,
  context?: ObjectSchemaValidator<any>
};

export type ApiImplementationFactory<T extends ApiDefinition = any> = () => ApiControllerImplementation<T> | Promise<ApiControllerImplementation<T>>;

export type ApiEndpointKeys<T extends ApiDefinition> = keyof T['endpoints'];
export type ApiEndpoint<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = T['endpoints'][K];
export type ApiContextType<T extends ApiDefinition> = SchemaOutput<NonUndefinable<T['context']>>;

export type ApiEndpointParametersSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['parameters']>['schema'];
export type ApiEndpointBodySchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['body']>['schema'];
export type ApiEndpointResultSchema<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = NonUndefinable<ApiEndpoint<T, K>['result']>['schema'];

export type ApiEndpointParametersInput<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaInput<ApiEndpointParametersSchema<T, K>>;
export type ApiEndpointParametersOutput<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaOutput<ApiEndpointParametersSchema<T, K>>;
export type ApiEndpointBody<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaOutput<ApiEndpointBodySchema<T, K>>;

export type ApiEndpointResultType<T extends ApiDefinition, K extends ApiEndpointKeys<T>> = SchemaOutput<ApiEndpointResultSchema<T, K>> | HttpServerResponse;

export type ApiEndpointServerImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  (parameters: ApiEndpointParametersOutput<T, K>, body: ApiEndpointBody<T, K>, request: HttpServerRequest, context: ApiContextType<T>) => ApiEndpointResultType<T, K> | Promise<ApiEndpointResultType<T, K>>;

export type ApiEndpointClientImplementation<T extends ApiDefinition = ApiDefinition, K extends ApiEndpointKeys<T> = ApiEndpointKeys<T>> =
  ApiEndpointBody<T, K> extends never
  ? (parameters: ApiEndpointParametersOutput<T, K>) => ApiEndpointResultType<T, K> | Promise<ApiEndpointResultType<T, K>>
  : (parameters: ApiEndpointParametersOutput<T, K>, body: ApiEndpointBody<T, K>) => ApiEndpointResultType<T, K> | Promise<ApiEndpointResultType<T, K>>;

export type ApiControllerImplementation<T extends ApiDefinition = any> = {
  [P in ApiEndpointKeys<T>]: ApiEndpointServerImplementation<T, P>
};


export type ApiClientImplementation<T extends ApiDefinition = any> = {
  [P in ApiEndpointKeys<T>]: ApiEndpointClientImplementation<T, P>
};

export function defineApi<T extends ApiDefinition>(definition: T): T {
  return definition;
}

export function registerApi<T extends ApiDefinition>(definition: T, implementationOrFactory: ApiControllerImplementation<T> | ApiImplementationFactory<T>): void {
  registeredApis.set(definition, implementationOrFactory);
}
