import 'urlpattern-polyfill'; // eslint-disable-line import/no-unassigned-import

import { BadRequestError } from '#/errors/bad-request.error.js';
import { NotFoundError } from '#/errors/not-found.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
import type { HttpServerRequestContext } from '#/http/server/http-server.js';
import type { HttpServerRequest } from '#/http/server/index.js';
import { HttpServerResponse } from '#/http/server/index.js';
import type { ReadBodyOptions } from '#/http/utils.js';
import type { Resolvable } from '#/injector/index.js';
import { InjectArg, ResolveArg, Singleton, resolveArgumentType } from '#/injector/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { SchemaTestable } from '#/schema/index.js';
import { Schema } from '#/schema/index.js';
import { ServerSentEventsSource } from '#/sse/server-sent-events-source.js';
import type { Type, UndefinableJson } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import type { AsyncMiddleware, AsyncMiddlewareNext, ComposedAsyncMiddleware } from '#/utils/middleware.js';
import { composeAsyncMiddleware } from '#/utils/middleware.js';
import { mapObjectValues } from '#/utils/object/object.js';
import { deferThrow } from '#/utils/throw.js';
import { isArray, isBlob, isDefined, isNull, isNullOrUndefined, isObject, isReadableStream, isUint8Array, isUndefined } from '#/utils/type-guards.js';
import { mebibyte } from '#/utils/units.js';
import type { ApiBinaryType, ApiController, ApiDefinition, ApiEndpointDefinition, ApiEndpointMethod, ApiEndpointServerImplementation, ApiRequestContext } from '../types.js';
import { normalizedApiDefinitionEndpointsEntries } from '../types.js';
import { getFullApiEndpointResource } from '../utils.js';
import { ApiRequestTokenProvider } from './api-request-token.provider.js';
import { handleApiError } from './error-handler.js';
import type { CorsMiddlewareOptions } from './middlewares/cors.middleware.js';
import { allowedMethodsMiddleware, contentTypeMiddleware, corsMiddleware, getCatchErrorMiddleware, responseTimeMiddleware } from './middlewares/index.js';
import { API_MODULE_OPTIONS } from './tokens.js';

const defaultMaxBytes = 10 * mebibyte;

export type ApiGatewayMiddlewareContext = {
  readonly api: ApiItem,

  /** can be undefined if used before allowedMethods middleware */
  readonly endpoint: GatewayEndpoint,
  readonly resourcePatternResult: URLPatternResult,

  readonly request: HttpServerRequest,
  readonly response: HttpServerResponse
};

export type ApiGatewayMiddlewareNext = AsyncMiddlewareNext;
export type ApiGatewayMiddleware = AsyncMiddleware<ApiGatewayMiddlewareContext>;

export abstract class ApiGatewayOptions {
  /**
   * Api prefix. Pass `null` to disable prefix.
   * @default api
   */
  prefix?: string | null;

  /** Initial middlewares */
  middlewares?: ApiGatewayMiddleware[];

  /** Errors to supress in log output */
  supressedErrors?: Type<Error>[];

  /** Cors middleware options */
  cors?: CorsMiddlewareOptions;

  /**
   * Maximum size of request body. Useful to prevent harmful requests.
   * @default 10 MB
   */
  defaultMaxBytes?: number;
}

export type GatewayEndpoint = {
  definition: ApiEndpointDefinition,
  implementation: ApiEndpointServerImplementation
};

export type ApiItem = {
  resource: string,
  pattern: URLPattern,
  endpoints: Map<ApiEndpointMethod, GatewayEndpoint>
};

export type EndpointMetadataBodyType = 'none' | 'text' | 'json' | 'buffer' | 'stream';

export type ApiGatewayArgument = ApiGatewayOptions;

export type ApiMetadata = {
  api: ApiItem,
  patternResult: URLPatternResult
};

/**
 * router for {@link ApiTransport} requests to {@link ApiImplementation}
 * @todo error handling (standardized format, serialization etc.)
 */
@Singleton({
  defaultArgumentProvider: (context) => context.resolve(API_MODULE_OPTIONS).gatewayOptions
})
export class ApiGateway implements Resolvable<ApiGatewayOptions> {
  private readonly requestTokenProvider: ApiRequestTokenProvider;
  private readonly logger: Logger;
  private readonly prefix: string | null;
  private readonly apis: Map<string, ApiItem>;
  private readonly middlewares: ApiGatewayMiddleware[];
  private readonly supressedErrors: Set<Type<Error>>;
  private readonly catchErrorMiddleware: ApiGatewayMiddleware;
  private readonly options: ApiGatewayOptions;

  private composedMiddleware: ComposedAsyncMiddleware<ApiGatewayMiddlewareContext>;

  declare readonly [resolveArgumentType]: ApiGatewayOptions;
  constructor(requestTokenProvider: ApiRequestTokenProvider, @ResolveArg<LoggerArgument>('ApiGateway') logger: Logger, @InjectArg() options: ApiGatewayOptions = {}) {
    this.requestTokenProvider = requestTokenProvider;
    this.logger = logger;
    this.options = options;

    this.prefix = isNull(options.prefix) ? null : (options.prefix ?? 'api');
    this.apis = new Map();
    this.middlewares = options.middlewares ?? [];
    this.supressedErrors = new Set(options.supressedErrors);
    this.catchErrorMiddleware = getCatchErrorMiddleware(this.supressedErrors, logger);

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

  registerApi<T extends ApiDefinition>(definition: ApiDefinition, implementation: ApiController<T>): void {
    for (const [name, endpointDefinition] of normalizedApiDefinitionEndpointsEntries(definition.endpoints)) {
      const versionArray = isUndefined(endpointDefinition.version) ? [1] : toArray(endpointDefinition.version);

      for (const version of versionArray) {
        const resource = getFullApiEndpointResource({ api: definition, endpoint: endpointDefinition, defaultPrefix: this.prefix, explicitVersion: version });
        const methods = isArray(endpointDefinition.method) ? endpointDefinition.method : [endpointDefinition.method ?? 'GET'];

        if (methods.length == 0) {
          throw new Error(`No method provided for resource ${resource}.`);
        }

        let resourceApis = this.apis.get(resource);

        if (isUndefined(resourceApis)) {
          resourceApis = {
            resource,
            pattern: new URLPattern({
              pathname: resource,
              baseURL: 'http://localhost',
              username: '*',
              password: '*',
              protocol: '*',
              hostname: '*',
              port: '*',
              search: '*',
              hash: '*'
            }),
            endpoints: new Map()
          };

          this.apis.set(resource, resourceApis);
        }

        const endpointImplementation = implementation[name]?.bind(implementation) ?? deferThrow(() => new NotImplementedError(`Endpoint ${name} for resource ${resource} not implemented.`));

        for (const method of methods) {
          resourceApis.endpoints.set(method, { definition: endpointDefinition, implementation: endpointImplementation as ApiEndpointServerImplementation });
        }
      }
    }
  }

  async handleHttpServerRequestContext({ request, respond, close }: HttpServerRequestContext): Promise<void> {
    let responded = false;

    const response = new HttpServerResponse();

    try {
      const { api, patternResult } = this.getApiMetadata(request.url);
      const endpoint = api.endpoints.get(request.method)!;
      const context: ApiGatewayMiddlewareContext = { api, resourcePatternResult: patternResult, endpoint, request, response };

      await this.composedMiddleware(context);

      responded = true;

      await respond(context.response);
    }
    catch (error) {
      try {
        handleApiError(error, response, this.supressedErrors, this.logger);

        if (responded) {
          await close();
        }
        else {
          try {
            await respond(response);
          }
          catch (errorRespondError) {
            this.logger.error(errorRespondError as Error);
            await close();
          }
        }
      }
      catch { /* ignore */ }
    }
  }

  getApiMetadata(resource: URL): ApiMetadata {
    const urlWithoutPort = new URL(resource);
    urlWithoutPort.port = '';

    for (const api of this.apis.values()) {
      const result = api.pattern.exec(urlWithoutPort);

      if (isNullOrUndefined(result)) {
        continue;
      }

      return { api, patternResult: result };
    }

    throw new NotFoundError(`Resource ${resource.pathname} not available.`);
  }

  private updateMiddleware(): void {
    const middlewares: ApiGatewayMiddleware[] = [responseTimeMiddleware, contentTypeMiddleware, this.catchErrorMiddleware, corsMiddleware(this.options.cors), allowedMethodsMiddleware, ...this.middlewares, async (context, next) => this.endpointMiddleware(context, next)];
    this.composedMiddleware = composeAsyncMiddleware(middlewares);
  }

  private async endpointMiddleware(context: ApiGatewayMiddlewareContext, next: ApiGatewayMiddlewareNext): Promise<void> {
    const readBodyOptions: ReadBodyOptions = { maxBytes: context.endpoint.definition.maxBytes ?? this.options.defaultMaxBytes ?? defaultMaxBytes };

    const body = isDefined(context.endpoint.definition.body)
      ? await getBody(context.request, readBodyOptions, context.endpoint.definition.body)
      : undefined;

    const bodyAsParameters = (isUndefined(context.endpoint.definition.body) && (context.request.headers.contentType?.includes('json') == true))
      ? await context.request.body.readAsJson(readBodyOptions)
      : undefined;

    if (isDefined(bodyAsParameters) && !isObject(bodyAsParameters)) {
      throw new BadRequestError('Expected json object as body.');
    }

    const decodedUrlParameters = mapObjectValues(context.resourcePatternResult.pathname.groups, (value) => isDefined(value) ? decodeURIComponent(value) : undefined);
    const parameters = { ...context.request.query.asObject(), ...bodyAsParameters, ...decodedUrlParameters };

    const validatedParameters = isDefined(context.endpoint.definition.parameters)
      ? Schema.parse(context.endpoint.definition.parameters, parameters)
      : parameters;

    const requestContext: ApiRequestContext = {
      parameters: validatedParameters,
      body,
      request: context.request,
      getToken: async () => this.requestTokenProvider.getToken(requestContext)
    };

    const result = await context.endpoint.implementation(requestContext);

    if (result instanceof HttpServerResponse) {
      context.response.update(result); // eslint-disable-line require-atomic-updates
    }
    else {
      context.response.body = isUint8Array(result) ? { buffer: result } // eslint-disable-line require-atomic-updates
        : isBlob(result) ? { stream: result.stream() as unknown as ReadableStream<Uint8Array> }
          : isReadableStream<Uint8Array>(result) ? { stream: result }
            : (result instanceof ServerSentEventsSource) ? { events: result }
              : (context.endpoint.definition.result == String) ? { text: result }
                : { json: result };
    }

    await next();
  }
}

async function getBody(request: HttpServerRequest, options: ReadBodyOptions, schema: SchemaTestable | ApiBinaryType): Promise<UndefinableJson | Uint8Array | Blob | ReadableStream<Uint8Array>> {
  let body: Awaited<ReturnType<typeof getBody>> | undefined;

  if (request.hasBody) {
    if (schema == ReadableStream) {
      body = request.body.readAsBinaryStream(options);
    }
    else if (schema == Uint8Array) {
      body = await request.body.readAsBuffer(options);
    }
    else if (schema == Blob) {
      const buffer = await request.body.readAsBuffer(options);
      body = new Blob([buffer], { type: request.headers.contentType });
    }
    else if (schema == String) {
      body = await request.body.readAsText(options);
    }
    else if (request.headers.contentType?.startsWith('text') == true) {
      body = await request.body.readAsText(options);
    }
    else if (request.headers.contentType?.includes('json') == true) {
      body = await request.body.readAsJson(options);
    }
    else {
      body = await request.body.readAsBuffer(options);
    }
  }

  return Schema.parse(schema as SchemaTestable<UndefinableJson | Uint8Array | ReadableStream>, body);
}
