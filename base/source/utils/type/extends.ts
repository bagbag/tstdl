import type { AbstractConstructor } from '#/types.js';

export function typeExtends<Type extends AbstractConstructor, Base extends Type>(type: Type, base: Base): type is Base;
export function typeExtends<Base extends AbstractConstructor>(type: AbstractConstructor, base: Base): type is Base;
export function typeExtends(type: AbstractConstructor, base: AbstractConstructor): boolean {
  return ((type == base) || (type.prototype instanceof base));
}
