import { Singleton, type InjectableOptionsWithoutLifecycle } from '#/injector/decorators.js';
import type { Constructor, Type } from '#/types/index.js';
import { objectEntries } from '#/utils/object/object.js';
import { isFunction } from '#/utils/type-guards.js';
import type { ApiController, ApiDefinition } from '../types.js';

type ApiDefinitionProvider = () => ApiDefinition;

export const apiControllerDefinition: unique symbol = Symbol('ApiController definition');

const registeredApiControllers = new Map<Type<ApiController>, ApiDefinition | ApiDefinitionProvider>();

export function getApiControllerDefinition(controller: Type | ApiController): ApiDefinition {
  const controllerType = isFunction(controller) ? controller : controller.constructor as Type;

  ensureApiController(controllerType);

  const definitionOrProvider = registeredApiControllers.get(controllerType)!;

  if (isFunction(definitionOrProvider)) {
    return definitionOrProvider();
  }

  return definitionOrProvider;
}

export function isApiController(controller: Type): boolean {
  return registeredApiControllers.has(controller);
}

export function ensureApiController(controller: Type): void {
  if (!isApiController(controller)) {
    throw new Error(`Provided type ${(controller as Type | undefined)?.name} is not a known ApiController. Make sure to use the @apiController decorator.`);
  }
}

export function apiController<T = Type<ApiController>, A = any>(definition: ApiDefinition | ApiDefinitionProvider, injectableOptions: InjectableOptionsWithoutLifecycle<T, A> = {}): ClassDecorator { // eslint-disable-line @typescript-eslint/naming-convention
  function apiControllerDecorator<U extends T>(constructor: Constructor<U>): void {
    registeredApiControllers.set(constructor as unknown as Type<ApiController>, definition);
    Singleton(injectableOptions)(constructor);
  }

  return apiControllerDecorator as ClassDecorator;
}

export function implementApi<T extends ApiDefinition>(definition: T, implementation: ApiController<T>): Constructor<ApiController<T>> {
  const { resource: path } = definition;
  const constructedApiName = (path[0]?.toUpperCase() ?? '') + path.slice(1);
  const apiName = `${constructedApiName}ApiController`;

  const api = {
    [apiName]: class { }
  }[apiName]!;

  apiController(definition)(api);

  const implementationEntries = objectEntries(implementation);

  for (const [name, handler] of implementationEntries) {
    Object.defineProperty(api.prototype, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: handler,
    });
  }

  return api as unknown as Constructor<ApiController<T>>;
}
