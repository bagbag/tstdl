import type { ObjectLiteral } from '#/types.js';
import { FactoryMap } from './factory-map.js';

export type Builder<T> = () => T;
export type AsyncBuilder<T> = () => Promise<T>;

const globalScope = Symbol('global singleton scope');
const scopes = new FactoryMap(() => new Map<any, any>());

export function singleton<T>(type: ObjectLiteral, builder: Builder<T>): T;
export function singleton<T>(type: ObjectLiteral, builder: AsyncBuilder<T>): Promise<T>;
export function singleton<T>(scope: ObjectLiteral, type: ObjectLiteral, builder: Builder<T>): T;
export function singleton<T>(scope: ObjectLiteral, type: ObjectLiteral, builder: AsyncBuilder<T>): Promise<T>;
export function singleton<T>(scopeOrType: ObjectLiteral, typeOrBuilder: Builder<T> | AsyncBuilder<T> | ObjectLiteral, _builder?: Builder<T>): T | Promise<T> {
  const builder = _builder ?? typeOrBuilder as Builder<T> | AsyncBuilder<T>;
  const scope = _builder == undefined ? globalScope : scopeOrType;
  const type = _builder == undefined ? scopeOrType : typeOrBuilder;

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
