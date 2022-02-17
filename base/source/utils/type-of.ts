/* eslint-disable @typescript-eslint/ban-types */

import { isNull } from './type-guards';

/**
 * get the type of value. Returns 'null' instead of 'object' for null, tries to distinguish between function and class and to get their names
 * @param value value to get type of
 */
export function typeOf(value: any): string {
  const type = typeof value;

  if (type == 'function') {
    const functionString = (value as Function).toString();

    const name = ((value as Function).name.length == 0) ? 'anonymous' : (value as Function).name;

    if (functionString.startsWith('class')) {
      return `[class ${name}]`;
    }

    return `[function ${name}]`;
  }

  if (type == 'object') {
    if (isNull(value)) {
      return 'null';
    }

    const constructor = (((value as object['constructor']).prototype ?? Object.getPrototypeOf(value)) as { constructor: Function }).constructor;

    if (constructor == Object) {
      return 'object';
    }

    const name = (constructor.name.length == 0) ? 'anonymous' : constructor.name;

    return `[instanceof ${name}]`;
  }

  return type;
}
