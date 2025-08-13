import type { ComponentClass, FunctionComponent } from 'preact';
import { Component } from 'preact';

import type { AbstractConstructor } from '#/types/index.js';
import { typeExtends } from '#/utils/type/index.js';

export function isComponentClass(template: FunctionComponent<any> | ComponentClass<any, any>): template is ComponentClass<any, any> {
  return typeExtends(template as AbstractConstructor, Component);
}
