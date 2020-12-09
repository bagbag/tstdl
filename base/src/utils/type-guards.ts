export function isUndefined(item: any): item is undefined {
  return item == undefined;
}

export function isDefined<T>(item: T): item is NonNullable<T> {
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

export function isNotNumber<T>(item: T): item is (T extends number ? never : T) {
  return typeof item != 'number';
}

export function isString(item: any): item is string {
  return typeof item == 'string';
}

export function isNotString<T>(item: T): item is (T extends string ? never : T) {
  return typeof item != 'string';
}

export function isBoolean(item: any): item is boolean {
  return typeof item == 'boolean';
}

export function isNotBoolean<T>(item: T): item is (T extends boolean ? never : T) {
  return typeof item != 'boolean';
}

export function isBigint(item: any): item is bigint {
  return typeof item == 'bigint';
}

export function isNotBigInt<T>(item: T): item is (T extends bigint ? never : T) {
  return typeof item != 'bigint';
}

export function isFunction(item: any): item is Function { // eslint-disable-line @typescript-eslint/ban-types
  return typeof item == 'function';
}

export function isNotFunction<T>(item: T): item is (T extends Function ? never : T) { // eslint-disable-line @typescript-eslint/ban-types
  return typeof item != 'function';
}

export function isSymbol(item: any): item is symbol {
  return typeof item == 'symbol';
}

export function isNotSymbol<T>(item: T): item is (T extends symbol ? never : T) { // eslint-disable-line @typescript-eslint/ban-types
  return typeof item != 'symbol';
}

export function isObject(item: any): item is object { // eslint-disable-line @typescript-eslint/ban-types
  return typeof item == 'object';
}

export function isNotObject<T>(item: T): item is (T extends object ? never : T) { // eslint-disable-line @typescript-eslint/ban-types
  return typeof item != 'object';
}
