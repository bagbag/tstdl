import { container, resolveArg, singleton } from '#/container';
import { BadRequestError, NotFoundError, NotImplementedError } from '#/error';
import type { HttpServerRequest } from '#/http/server';
import { HttpServerResponse } from '#/http/server';
import type { HttpServerRequestContext } from '#/http/server/http-server';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import { ObjectSchemaValidator, StringSchemaValidator, Uint8ArraySchemaValidator } from '#/schema';
import type { Json, StringMap, Type, UndefinableJson } from '#/types';
import { toArray } from '#/utils/array';
import { _throw } from '#/utils/helpers';
import type { AsyncMiddleware, ComposedAsyncMiddlerware } from '#/utils/middleware';
import { composeAsyncMiddleware } from '#/utils/middleware';
import { ForwardRef, lazyObject } from '#/utils/object';
import { isDefined, isNull, isNullOrUndefined, isObject, isString, isUint8Array, isUndefined } from '#/utils/type-guards';
import type * as URLPatternImport from 'urlpattern-polyfill';
import type { URLPattern } from 'urlpattern-polyfill';
import type { ApiController } from './api-controller';
import { getApiControllerDefinition } from './api-controller';
import { errorCatchMiddleware, responseTimeMiddleware } from './middlewares';
import type { ApiControllerImplementation, ApiDefinition, ApiEndpointDefinition, ApiEndpointDefinitionBody, ApiEndpointMethod, ApiEndpointServerImplementation } from './types';
import { rootResource } from './types';

const UrlPattern: typeof URLPattern = ForwardRef.create();

// eslint-disable-next-line no-eval
void (eval('import(\'urlpattern-polyfill\')') as Promise<typeof URLPatternImport>).then((imported) => ForwardRef.setRef(UrlPattern, imported.URLPattern));

type Endpoint = {
  definition: ApiEndpointDefinition,
  implementation: ApiEndpointServerImplementation
};

type ApiItem = {
  resource: string,
  pattern: URLPattern,
  endpoints: Map<ApiEndpointMethod, Endpoint>
};

export type EndpointMetadataBodyType = 'none' | 'text' | 'json' | 'buffer' | 'stream';

type EndpointParseResult = {
  api: ApiItem,
  endpoint: Endpoint,
  resourceParameters: StringMap<string>
};

/**
 * router for {@link ApiTransport} requests to {@link ApiImplementation}
 * @todo error handling (standardized format, serialization etc.)
 */
@singleton()
export class ApiGateway {
  private readonly logger: Logger;
  private readonly apis: Map<string, ApiItem>;
  private readonly middlewares: AsyncMiddleware<HttpServerRequest, HttpServerResponse>[];
  private readonly supressedErrorLogs: Set<Type<Error>>;
  private readonly errorCatchMiddleware: AsyncMiddleware<HttpServerRequest, HttpServerResponse>;

  private handler: ComposedAsyncMiddlerware<HttpServerRequest, HttpServerResponse>;

  constructor(@resolveArg<LoggerArgument>(ApiGateway.name) logger: Logger) {
    this.logger = logger;

    this.apis = new Map();
    this.middlewares = [];
    this.supressedErrorLogs = new Set();
    this.errorCatchMiddleware = errorCatchMiddleware(logger, this.supressedErrorLogs);

    this.updateMiddleware();
  }

  addMiddleware(middleware: AsyncMiddleware<HttpServerRequest, HttpServerResponse>): void {
    this.middlewares.push(middleware);
    this.updateMiddleware();
  }

  supressErrors(...errorTypes: Type<Error>[]): void {
    for (const type of errorTypes) {
      this.supressedErrorLogs.add(type);
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
        const resource = (endpointDefinition.resource == rootResource) ? `${versionPrefix}${base}` : `${versionPrefix}${base}/${endpointDefinition.resource ?? name}`;
        const method = endpointDefinition.method ?? 'get';

        let resourceApis = this.apis.get(resource);

        if (isUndefined(resourceApis)) {
          resourceApis = lazyObject({
            resource: { value: resource },
            pattern: { initializer: () => new UrlPattern(resource, 'http://localhost') },
            endpoints: { value: new Map() }
          });

          this.apis.set(resource, resourceApis);
        }

        const endpoint = implementation[name] ?? (() => _throw(new NotImplementedError(`endpoint ${name} for resource ${resource} not implemented`)));
        resourceApis.endpoints.set(method, { definition: endpointDefinition, implementation: endpoint as ApiEndpointServerImplementation });
      }
    }
  }

  async handleHttpServerRequestContext({ request, respond }: HttpServerRequestContext): Promise<void> {
    const response = await this.handler(request);
    await respond(response);
  }

  private updateMiddleware(): void {
    const middlewares: AsyncMiddleware<HttpServerRequest, HttpServerResponse>[] = [this.errorCatchMiddleware, responseTimeMiddleware, ...this.middlewares];
    this.handler = composeAsyncMiddleware(middlewares, async (request) => this.middlewareHandler(request));
  }

  private async middlewareHandler(request: HttpServerRequest): Promise<HttpServerResponse> {
    const { endpoint, resourceParameters } = this.getEndpointMetadata(request.url, request.method);

    const body = isDefined(endpoint.definition.body)
      ? await this.getBody(request, endpoint.definition.body)
      : undefined;

    const bodyAsParameters = (isDefined(endpoint.definition.body) && (request.headers.contentType?.includes('json') == true))
      ? await request.bodyAsJson()
      : undefined;

    if (isDefined(bodyAsParameters) && !isObject(bodyAsParameters)) {
      throw new BadRequestError('expected json object as body');
    }

    const parameters = { ...request.query.asObject(), ...bodyAsParameters, ...resourceParameters };

    const validatedParameters = isDefined(endpoint.definition.parameters)
      ? await endpoint.definition.parameters.parseAsync(parameters)
      : parameters;

    const result = await endpoint.implementation(validatedParameters, body as any, request, request.context); // eslint-disable-line @typescript-eslint/no-unsafe-argument

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

  private getEndpointMetadata(resource: URL, method: ApiEndpointMethod): EndpointParseResult {
    const urlWithoutPort = new URL(resource);
    urlWithoutPort.port = '';

    for (const api of this.apis.values()) {
      const result = api.pattern.exec(urlWithoutPort);

      if (isNullOrUndefined(result)) {
        continue;
      }

      const endpoint = api.endpoints.get(method);

      if (isUndefined(endpoint)) {
        throw new NotFoundError(`method ${method} for resource ${resource.href} not available`);
      }

      return { api, resourceParameters: result.pathname.groups, endpoint };
    }

    throw new NotFoundError(`resource ${resource.href} not available`);
  }
}
