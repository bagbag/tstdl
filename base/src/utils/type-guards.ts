export function isUndefined(item: any): item is undefined {
  return item == undefined;
}

export function isNotUndefined<T>(item: T): item is NonNullable<T> {
  return item != undefined;
}

export function isNull(item: any): item is null {
  return item === null;
}

export function isNotNull<T>(item: T): item is (T extends null ? never : T) {
  return item !== null;
}

export function isNumber(item: any): item is number {
  return typeof item == 'number';
}

export function isString(item: any): item is string {
  return typeof item == 'string';
}

export function isBoolean(item: any): item is boolean {
  return typeof item == 'boolean';
}

export function isBigint(item: any): item is bigint {
  return typeof item == 'bigint';
}

export function isFunction(item: any): item is Function { // eslint-disable-line @typescript-eslint/ban-types
  return typeof item == 'function';
}
