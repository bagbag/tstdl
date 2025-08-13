import type { AbstractConstructor } from '#/types/index.js';
import { isUndefined } from '../type-guards.js';

declare class EmptyClass { }

export function getClassOfName(name: string): typeof EmptyClass;
export function getClassOfName<T extends AbstractConstructor>(name: string, extend: T): T;
export function getClassOfName(name: string, extend?: AbstractConstructor): AbstractConstructor {
  if (isUndefined(extend)) {
    return { [name]: class { } }[name]!;
  }

  return { [name]: class extends extend { } }[name]!;
}
