/* eslint-disable max-classes-per-file */
import type { AbstractType, Type } from '#/types.js';
import { isString } from '#/utils/type-guards.js';
import { container } from './container.js';

const isStubClassSymbol = Symbol('Stub class');

export function stubClass<T>(forClass: string | AbstractType<T>): Type<T> {
  const forClassName = isString(forClass) ? forClass : forClass.name;
  const stubName = `${forClassName}Stub`;

  const stub = {
    [stubName]: class { // eslint-disable-line @typescript-eslint/no-extraneous-class
      constructor() {
        throw new Error(`Stub class for ${forClassName} not instantiable.`);
      }
    }
  }[stubName]!;

  (stub as unknown as { [isStubClassSymbol]: true })[isStubClassSymbol] = true;

  container.register(stub, { useClass: stub });

  return stub as any as Type<T>;
}

export function isStubClass(target: object): boolean {
  return (target as { [isStubClassSymbol]?: boolean })[isStubClassSymbol] === true;
}
