import { FactoryMap } from './factory-map';

export type Builder<T> = () => T;
export type AsyncBuilder<T> = () => Promise<T>;

const globalScope = Symbol('global singleton scope');
const scopes: FactoryMap<any, Map<any, any>> = new FactoryMap(() => new Map());

export function singleton<T>(type: any, builder: Builder<T>): T;
export function singleton<T>(type: any, builder: AsyncBuilder<T>): Promise<T>;
export function singleton<T>(scope: any, type: any, builder: Builder<T>): T;
export function singleton<T>(scope: any, type: any, builder: AsyncBuilder<T>): Promise<T>;
export function singleton<T>(scopeOrType: any, typeOrBuilder: Builder<T> | AsyncBuilder<T> | any, _builder?: Builder<T>): T | Promise<T> {
  const builder = _builder != undefined ? _builder : typeOrBuilder as Builder<T> | AsyncBuilder<T>;
  const scope = _builder != undefined ? scopeOrType : globalScope;
  const type = _builder != undefined ? typeOrBuilder : scopeOrType;

  const instances = scopes.get(scope);

  if (!instances.has(type)) {
    const instanceOrPromise = builder();
    instances.set(type, instanceOrPromise);

    if (instanceOrPromise instanceof Promise) {
      return asyncSingleton(instances, type, instanceOrPromise);
    }
  }

  return instances.get(type) as T | Promise<T>;
}

async function asyncSingleton<T>(instances: Map<any, any>, type: any, promise: Promise<T>): Promise<T> {
  const instance = await promise;
  instances.set(type, instance);

  return instance;
}
