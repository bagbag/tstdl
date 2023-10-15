import type { AbstractConstructor } from '#/types.js';

export function typeExtends(type: AbstractConstructor, base: AbstractConstructor): boolean {
  return ((type == base) || (type.prototype instanceof base));
}
