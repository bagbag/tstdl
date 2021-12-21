import 'reflect-metadata';

// eslint-disable-next-line @typescript-eslint/ban-types
export function getDesignType(target: object, propertyKey?: string | symbol): unknown {
  return Reflect.getMetadata('design:type', target, propertyKey as string);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getParameterTypes(target: object, propertyKey?: string | symbol): unknown[] | undefined {
  return Reflect.getMetadata('design:paramtypes', target, propertyKey as string) as (any[] | undefined);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getReturnType(target: object, propertyKey?: string | symbol): unknown {
  return Reflect.getMetadata('design:returntype', target, propertyKey as string);
}
