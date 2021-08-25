/* eslint-disable @typescript-eslint/ban-types */

export function mapObject<T extends Record<any, any>, K extends string | number | symbol, V>(object: T, mapper: (key: keyof T, value: T[keyof T]) => [key: K, value: V]): Record<K, V> {
  const mappedEntries = Object.entries(object).map(([key, value]) => mapper(key, value as T[keyof T]));
  return Object.fromEntries(mappedEntries) as Record<K, V>;
}

export function mapObjectValues<T extends Record<any, any>, V>(object: T, mapper: (key: keyof T, value: T[keyof T]) => V): Record<keyof T, V> {
  return mapObject(object, (key, value) => [key, mapper(key, value)]);
}

export function filterObject<T extends Record<any, any>>(object: T, predicate: (key: keyof T, value: T[keyof T]) => boolean): Partial<T> {
  const mappedEntries = Object.entries(object).filter(([key, value]) => predicate(key, value as T[keyof T]));
  return Object.fromEntries(mappedEntries) as Partial<T>;
}

export function getGetter<T extends object, U extends keyof T>(obj: T, property: keyof T, bind: boolean): () => T[U] {
  if (!(property in obj)) {
    throw new Error(`property ${property as string} does not exist`);
  }

  let objOrPrototype = obj as object;

  while (!Object.prototype.hasOwnProperty.call(objOrPrototype, property)) {
    objOrPrototype = Object.getPrototypeOf(objOrPrototype) as object;
  }

  const descriptor = Object.getOwnPropertyDescriptor(objOrPrototype, property);

  if (descriptor == undefined) {
    throw new Error('could not get property descriptor');
  }

  if (descriptor.get == undefined) {
    throw new Error(`property ${property as string} has no getter`);
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = bind ? descriptor.get.bind(obj) : descriptor.get;
  return getter;
}
