import type { Constructor } from '#/types';
import { assertDefinedPass, isDefined } from '#/utils/type-guards';
import type { InjectionToken } from './token';
import type { ArgumentProvider, ForwardRefInjectionToken, Mapper } from './types';

export type InjectMetadata =
  (
    | { type: 'parameter', parameterIndex: number }
    | { type: 'property', propertyKey: PropertyKey }
  ) & {
    /** token from reflection metadata */
    token?: InjectionToken,

    /** token overwrite by inject decorator */
    injectToken?: InjectionToken,

    /** if defined, resolve the ForwardRefToken using ForwardRef strategy instead resolving the token */
    forwardRefToken?: ForwardRefInjectionToken,

    /** whether injection is optional if token is not registered. Set by optional decorator */
    optional?: boolean,

    /** mapper to map resolved value */
    mapper?: Mapper,

    /** provider to get resolve argument */
    resolveArgumentProvider?: ArgumentProvider,

    /** if defined, map the resolve argument and use the returned value as the value to inject */
    injectArgumentMapper?: Mapper,

    /** if defined, use the provided argument, map it and pass it to the resolution of the token */
    forwardArgumentMapper?: Mapper
  };

export type TypeInfo = {
  constructor: Constructor,
  parameters: InjectMetadata[],
  properties: Record<PropertyKey, InjectMetadata>
};

export const typeInfos = new Map<Constructor, TypeInfo>();

export function hasTypeInfo(constructor: Constructor): boolean {
  return typeInfos.has(constructor);
}

export function setTypeInfo(constructor: Constructor, typeInfo: TypeInfo): void {
  typeInfos.set(constructor, typeInfo);
}

export function getTypeInfo(constructor: Constructor, createIfMissing: boolean = false): TypeInfo {
  if (createIfMissing) {
    buildTypeInfoIfNeeded(constructor);
  }

  return assertDefinedPass(typeInfos.get(constructor), `type information for constructor ${(constructor as Constructor | undefined)?.name} not available`);
}

export function buildTypeInfoIfNeeded(constructor: Constructor): void {
  if (typeInfos.has(constructor)) {
    return;
  }

  const typeInfo: TypeInfo = {
    constructor,
    parameters: [],
    properties: {}
  };

  setTypeInfo(constructor, typeInfo);
}

export function getInjectMetadata(target: object, propertyKey: PropertyKey | undefined, parameterIndex: number | undefined, createIfMissing: boolean = false): InjectMetadata {
  const constructor = (((target as Constructor).prototype ?? target) as { constructor: Constructor }).constructor;
  const typeInfo = getTypeInfo(constructor, createIfMissing); // getOrCreateRegistration(constructor as Constructor);

  if (isDefined(propertyKey)) {
    return (typeInfo.properties[propertyKey] ?? (typeInfo.properties[propertyKey] = { type: 'property', propertyKey }));
  }

  if (isDefined(parameterIndex)) {
    return (typeInfo.parameters[parameterIndex] ?? (typeInfo.parameters[parameterIndex] = { type: 'parameter', parameterIndex }));
  }

  throw new Error('neither property nor parameterIndex provided');
}
