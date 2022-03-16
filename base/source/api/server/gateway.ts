import type { Injectable } from '#/container';
import { container, injectArg, resolveArg, resolveArgumentType, singleton } from '#/container';
import type { CustomError, CustomErrorStatic } from '#/error';
import { BadRequestError, NotFoundError, NotImplementedError } from '#/error';
import type { HttpServerRequest } from '#/http/server';
import { HttpServerResponse } from '#/http/server';
import type { HttpServerRequestContext } from '#/http/server/http-server';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import { ObjectSchemaValidator, StringSchemaValidator, Uint8ArraySchemaValidator } from '#/schema';
import type { Json, Type, UndefinableJson } from '#/types';
import { toArray } from '#/utils/array';
import { deferThrow, formatError, _throw } from '#/utils/helpers';
import type { AsyncMiddleware, AsyncMiddlewareNext, ComposedAsyncMiddleware } from '#/utils/middleware';
import { composeAsyncMiddleware } from '#/utils/middleware';
import { ForwardRef, lazyObject } from '#/utils/object';
import { isDefined, isNull, isNullOrUndefined, isObject, isString, isUint8Array, isUndefined } from '#/utils/type-guards';
import type * as URLPatternImport from 'urlpattern-polyfill';
import type { URLPattern } from 'urlpattern-polyfill';
import type { URLPatternResult } from 'urlpattern-polyfill/dist/url-pattern.interfaces';
import { createErrorResponse, getErrorStatusCode, hasErrorHandler } from '../response';
import type { ApiControllerImplementation, ApiDefinition, ApiEndpointDefinition, ApiEndpointDefinitionBody, ApiEndpointMethod, ApiEndpointServerImplementation, ApiEndpointServerRequestData } from '../types';
import { rootResource } from '../types';
import type { ApiController } from './api-controller';
import { getApiControllerDefinition } from './api-controller';
import { allowedMethodsMiddleware, corsMiddleware, responseTimeMiddleware } from './middlewares';

const UrlPattern: typeof URLPattern = ForwardRef.create();

// eslint-disable-next-line no-eval
void (eval('import(\'urlpattern-polyfill\')') as Promise<typeof URLPatternImport>).then((imported) => ForwardRef.setRef(UrlPattern, imported.URLPattern));

export type ApiGatewayMiddlewareContext = {
  api: ApiItem,

  /** can be undefined if used before allowedMethods middleware */
  endpoint: GatewayEndpoint,
  resourcePatternResult: URLPatternResult
};

export type ApiGatewayMiddlewareNext = AsyncMiddlewareNext<HttpServerRequest, HttpServerResponse>;
export type ApiGatewayMiddleware = AsyncMiddleware<HttpServerRequest, HttpServerResponse, ApiGatewayMiddlewareContext>;

export type ApiGatewayOptions = {
  /** default: api/ */
  prefix?: string
};

export type GatewayEndpoint = {
  definition: ApiEndpointDefinition,
  implementation: ApiEndpointServerImplementation
};

type ApiItem = {
  resource: string,
  pattern: URLPattern,
  endpoints: Map<ApiEndpointMethod, GatewayEndpoint>
};

export type EndpointMetadataBodyType = 'none' | 'text' | 'json' | 'buffer' | 'stream';

export type ApiGatewayArgument = ApiGatewayOptions;

/**
 * router for {@link ApiTransport} requests to {@link ApiImplementation}
 * @todo error handling (standardized format, serialization etc.)
 */
@singleton()
export class ApiGateway implements Injectable<ApiGatewayOptions> {
  private readonly logger: Logger;
  private readonly prefix: string;
  private readonly apis: Map<string, ApiItem>;
  private readonly middlewares: ApiGatewayMiddleware[];
  private readonly supressedErrors: Set<Type<Error>>;

  private handler: ComposedAsyncMiddleware<HttpServerRequest, HttpServerResponse, ApiGatewayMiddlewareContext>;

  readonly [resolveArgumentType]: ApiGatewayOptions;
  constructor(@resolveArg<LoggerArgument>(ApiGateway.name) logger: Logger, @injectArg() options?: ApiGatewayOptions) {
    this.logger = logger;

    this.prefix = options?.prefix ?? 'api/';
    this.apis = new Map();
    this.middlewares = [];
    this.supressedErrors = new Set();

    this.updateMiddleware();
  }

  addMiddleware(middleware: ApiGatewayMiddleware): void {
    this.middlewares.push(middleware);
    this.updateMiddleware();
  }

  supressErrors(...errorTypes: Type<Error>[]): void {
    for (const type of errorTypes) {
      this.supressedErrors.add(type);
    }
  }

  async registerApiController(controller: Type<ApiController>): Promise<void> {
    const definition = getApiControllerDefinition(controller);
    const instance = await container.resolveAsync(controller);

    this.registerApi(definition, instance as unknown as ApiControllerImplementation);
  }

  registerApi<T extends ApiDefinition>(definition: ApiDefinition, implementation: ApiControllerImplementation<T>): void {
    const base = definition.resource;

    for (const [name, endpointDefinition] of Object.entries(definition.endpoints)) {
      const versionArray = isUndefined(endpointDefinition.version) ? [1] : toArray(endpointDefinition.version);

      for (const version of versionArray) {
        const versionPrefix = isNull(version) ? '' : `v${version}/`;
        const resource = (endpointDefinition.resource == rootResource) ? `${this.prefix}${versionPrefix}${base}` : `${this.prefix}${versionPrefix}${base}/${endpointDefinition.resource ?? name}`;
        const method = endpointDefinition.method ?? 'GET';

        let resourceApis = this.apis.get(resource);

        if (isUndefined(resourceApis)) {
          resourceApis = lazyObject({
            resource: { value: resource },
            pattern: {
              initializer: () => new UrlPattern({
                pathname: resource,
                baseURL: 'http://localhost',
                username: '*',
                password: '*',
                protocol: '*',
                hostname: '*',
                port: '*',
                search: '*',
                hash: '*'
              })
            },
            endpoints: { value: new Map() }
          });

          this.apis.set(resource, resourceApis);
        }

        const endpointImplementation = implementation[name]?.bind(implementation) ?? deferThrow(new NotImplementedError(`endpoint ${name} for resource ${resource} not implemented`));
        resourceApis.endpoints.set(method, { definition: endpointDefinition, implementation: endpointImplementation as ApiEndpointServerImplementation });
      }
    }
  }

  async handleHttpServerRequestContext({ request, respond }: HttpServerRequestContext): Promise<void> {
    try {
      const { api, patternResult } = this.getApiMetadata(request.url);
      const endpoint = api.endpoints.get(request.method)!;

      const response = await this.handler(request, { api, resourcePatternResult: patternResult, endpoint });

      await respond(response);
    }
    catch (error) {
      this.logger.error(error as Error, { includeRest: false, includeStack: false });

      try {
        const response = handleApiError(error, this.supressedErrors, this.logger);
        await respond(response);
      }
      catch { /* ignore */ }
    }
  }

  getApiMetadata(resource: URL): { api: ApiItem, patternResult: URLPatternResult } {
    const urlWithoutPort = new URL(resource);
    urlWithoutPort.port = '';

    for (const api of this.apis.values()) {
      const result = api.pattern.exec(urlWithoutPort);

      if (isNullOrUndefined(result)) {
        continue;
      }

      return { api, patternResult: result };
    }

    throw new NotFoundError(`resource ${resource.pathname} not available`);
  }

  private updateMiddleware(): void {
    const middlewares: ApiGatewayMiddleware[] = [responseTimeMiddleware, corsMiddleware, allowedMethodsMiddleware, ...this.middlewares];
    this.handler = composeAsyncMiddleware(middlewares, async (request, context) => this.middlewareHandler(request, context));
  }

  private async middlewareHandler(request: HttpServerRequest, context: ApiGatewayMiddlewareContext): Promise<HttpServerResponse> {
    const body = isDefined(context.endpoint.definition.body)
      ? await this.getBody(request, context.endpoint.definition.body)
      : undefined;

    const bodyAsParameters = (isUndefined(context.endpoint.definition.body) && (request.headers.contentType?.includes('json') == true))
      ? await request.bodyAsJson()
      : undefined;

    if (isDefined(bodyAsParameters) && !isObject(bodyAsParameters)) {
      throw new BadRequestError('expected json object as body');
    }

    const parameters = { ...request.query.asObject(), ...bodyAsParameters, ...context.resourcePatternResult.pathname.groups };

    const validatedParameters = isDefined(context.endpoint.definition.parameters)
      ? await context.endpoint.definition.parameters.parseAsync(parameters)
      : parameters;

    const requestData: ApiEndpointServerRequestData = {
      parameters: validatedParameters,
      body: body as any,
      request
    };

    const result = await context.endpoint.implementation(requestData);

    if (result instanceof HttpServerResponse) {
      return result;
    }

    const response = new HttpServerResponse();

    response.body =
      isString(result) ? { text: result }
        : isUint8Array(result) ? { buffer: result }
          : { json: result as UndefinableJson };

    return response;
  }

  private async getBody(request: HttpServerRequest, schema: ApiEndpointDefinitionBody): Promise<string | Json | Uint8Array | undefined> {
    const body = (schema instanceof ObjectSchemaValidator)
      ? await request.bodyAsJson()
      : (schema instanceof StringSchemaValidator)
        ? await request.bodyAsText()
        : (schema instanceof Uint8ArraySchemaValidator)
          ? await request.bodyAsBytes()
          : _throw(new Error('invalid body schema'));

    if (isUndefined(body)) {
      return undefined;
    }

    return schema.parseAsync(body);
  }
}

function handleApiError(error: unknown, supressedErrors: Set<Type<Error>>, logger: Logger): HttpServerResponse {
  logger.error(error as Error, { includeRest: false, includeStack: false });

  const response = new HttpServerResponse();

  if (error instanceof Error) {
    const errorConstructor = error.constructor as Type<Error> & CustomErrorStatic;
    const supressed = supressedErrors.has(errorConstructor);

    if (!supressed) {
      logger.error(error);
    }

    if (hasErrorHandler(errorConstructor)) {
      response.statusCode = getErrorStatusCode(error as CustomError);
      response.body = { json: createErrorResponse(error) };
    }
    else {
      response.statusCode = 500;
      response.body = { json: createErrorResponse('500', 'Internal Server Error') };
    }
  }
  else {
    const formattedError = formatError(error, { includeStack: true, includeRest: true, handleBuiltInErrors: true });
    logger.error(formattedError);

    response.statusCode = 500;
    response.body = { json: createErrorResponse('500', 'Internal Server Error') };
  }

  return response;
}
