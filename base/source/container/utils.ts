/* eslint-disable max-classes-per-file */
import type { AbstractType, Type } from '#/types';
import { isString } from '#/utils/type-guards';
import { injectable } from './decorators';

export const isStubClass = Symbol('stub class');

export function stubClass<T>(forClass: string | AbstractType<T>): Type<T> {
  const forClassName = isString(forClass) ? forClass : forClass.name;

  @injectable()
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class StubClass {
    static [isStubClass] = true;

    constructor() {
      throw new Error(`Stub class for ${forClassName} not instantiable.`);
    }
  }

  return StubClass as any as Type<T>;
}
