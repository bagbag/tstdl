// eslint-disable-next-line @typescript-eslint/ban-types
export function getDesignType(target: object, propertyKey?: string | symbol): any {
  return Reflect.getMetadata('design:type', target, propertyKey as string);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getParameterTypes(target: object, propertyKey?: string | symbol): any[] {
  return Reflect.getMetadata('design:paramtypes', target, propertyKey as string) as any[];
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getReturnType(target: object, propertyKey?: string | symbol): any {
  return Reflect.getMetadata('design:paramtypes', target, propertyKey as string);
}
