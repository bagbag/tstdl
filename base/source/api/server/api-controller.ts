/* eslint-disable max-classes-per-file */
import type { InjectableOptionsWithoutLifecycle } from '#/container';
import { singleton } from '#/container';
import type { Constructor, Type } from '#/types';
import type { ApiControllerImplementation, ApiDefinition } from '../types';

export const apiControllerDefinition: unique symbol = Symbol('ApiController definition');

const registeredApiControllers = new Map<Type<ApiControllerImplementation>, ApiDefinition>();

export function getApiControllerDefinition(controller: Type): ApiDefinition {
  ensureApiController(controller);
  return registeredApiControllers.get(controller)!;
}

export function isApiController(controller: Type): boolean {
  return registeredApiControllers.has(controller);
}

export function ensureApiController(controller: Type): void {
  if (!isApiController(controller)) {
    throw new Error(`Provided type ${(controller as Type | undefined)?.name} is not a known ApiController. Make sure to use @ApiController decorator`);
  }
}

export function apiController<T = Type<ApiControllerImplementation>, P = any>(definition: ApiDefinition, injectableOptions: InjectableOptionsWithoutLifecycle<T, P> = {}): ClassDecorator { // eslint-disable-line @typescript-eslint/naming-convention
  function apiControllerDecorator<U extends T>(constructor: Constructor<U>): void {
    registeredApiControllers.set(constructor as unknown as Type<ApiControllerImplementation>, definition);
    singleton(injectableOptions)(constructor);
  }

  return apiControllerDecorator as ClassDecorator;
}

export function implementApi<T extends ApiDefinition>(definition: T, implementation: ApiControllerImplementation<T>): Constructor<ApiControllerImplementation<T>> {
  const { resource: path } = definition;
  const constructedApiName = (path[0]?.toUpperCase() ?? '') + path.slice(1);
  const apiName = `${constructedApiName}ApiController`;

  const api = {
    [apiName]: class { }
  }[apiName]!;

  apiController(definition)(api);

  const implementationEntries = Object.entries(implementation);

  for (const [name, handler] of implementationEntries) {
    Object.defineProperty(api.prototype, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: handler
    });
  }

  return api as unknown as Constructor<ApiControllerImplementation<T>>;
}
