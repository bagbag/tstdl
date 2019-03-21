export type Builder<T> = () => T;

const globalScope = Symbol();
const scopes: Map<any, Map<any, any>> = new Map();

export function singleton<T>(type: Builder<T> | any, builder: Builder<T>): T;
export function singleton<T>(scope: any, type: Builder<T> | any, builder: Builder<T>): T;
export function singleton<T>(scopeOrType: any, typeOrBuilder: Builder<T> | any, _builder?: Builder<T>): T {
  const builder = _builder != undefined ? _builder : typeOrBuilder as Builder<T>;
  const scope = _builder != undefined ? scopeOrType : globalScope;
  const type = _builder != undefined ? typeOrBuilder : scopeOrType;

  const instances = getScopeInstances(scope);

  if (!instances.has(type)) {
    const instance = builder();
    instances.set(type, instance);
  }

  return instances.get(type) as T;
}

function getScopeInstances(scope: any): Map<any, any> {
  if (!scopes.has(scope)) {
    const instances = new Map();
    scopes.set(scope, instances);
  }

  return scopes.get(scope) as Map<any, any>;
}
