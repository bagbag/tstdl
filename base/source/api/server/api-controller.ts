/* eslint-disable max-classes-per-file */
import type { InjectableOptionsWithoutLifecycle } from '#/container';
import { singleton } from '#/container';
import type { Constructor, Type } from '#/types';
import type { ApiControllerImplementation, ApiDefinition } from '../types';

export const apiControllerDefinition: unique symbol = Symbol('ApiController definition');

const registeredApiControllers = new Map<Type<ApiController>, ApiDefinition>();

export function getApiControllerDefinition(controller: Type<ApiController>): ApiDefinition {
  if (!registeredApiControllers.has(controller)) {
    throw new Error('controller is unknown, make sure to use decorator');
  }

  return registeredApiControllers.get(controller)!;
}

export function apiController<T = Type<ApiController>, P = any>(definition: ApiDefinition, injectableOptions: InjectableOptionsWithoutLifecycle<T, P> = {}): ClassDecorator {
  function apiControllerDecorator<U extends T>(constructor: Constructor<U>): void {
    registeredApiControllers.set(constructor as unknown as Type<ApiController>, definition);
    singleton(injectableOptions)(constructor);
  }

  return apiControllerDecorator as ClassDecorator;
}

export class ApiController {
  readonly [apiControllerDefinition]: ApiDefinition;

  constructor(definition: ApiDefinition) {
    this[apiControllerDefinition] = definition;
  }
}

export function implementApi<T extends ApiDefinition>(definition: T, implementation: ApiControllerImplementation<T>): Constructor<ApiController & ApiControllerImplementation<T>> {
  const { resource: path } = definition;
  const constructedApiName = (path[0]?.toUpperCase() ?? '') + path.slice(1);
  const apiName = `${constructedApiName}ApiController`;

  const api = {
    [apiName]: class extends ApiController {
      constructor() {
        super(definition);
      }
    }
  }[apiName]!;

  const implementationEntries = Object.entries(implementation);

  for (const [name, handler] of implementationEntries) {
    Object.defineProperty(api.prototype, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: handler
    });
  }

  return api as unknown as Constructor<ApiController & ApiControllerImplementation<T>>;
}
