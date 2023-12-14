import 'reflect-metadata/lite'; // eslint-disable-line import/no-unassigned-import

import type { Type } from '#/types.js';

export function getDesignType(target: object, propertyKey?: string | symbol): Type {
  return Reflect.getMetadata('design:type', target, propertyKey as string) as Type;
}

export function hasDesignType(target: object, propertyKey?: string | symbol): boolean {
  return Reflect.hasMetadata('design:type', target, propertyKey as string);
}

export function getParameterTypes(target: object, propertyKey?: string | symbol): Type[] | undefined {
  return Reflect.getMetadata('design:paramtypes', target, propertyKey as string) as (Type[] | undefined);
}

export function hasParameterTypes(target: object, propertyKey?: string | symbol): boolean {
  return Reflect.hasMetadata('design:paramtypes', target, propertyKey as string);
}

export function getReturnType(target: object, propertyKey?: string | symbol): Type {
  return Reflect.getMetadata('design:returntype', target, propertyKey as string) as Type;
}

export function hasReturnType(target: object, propertyKey?: string | symbol): boolean {
  return Reflect.hasMetadata('design:returntype', target, propertyKey as string);
}
