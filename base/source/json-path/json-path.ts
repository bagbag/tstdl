import { isDefined, isUndefined } from '#/utils';

const numberPattern = /^\d+$/u;
const parsePattern = /(?:(?:^|\.)(?<dot>[^.[]+))|(?<root>^\$)|\[(?:(?:'(?<bracket>.+?)')|(?<index>\d+))\]|(?<error>.+?)/ug;

export type JsonPathOptions = {
  /** encode as array.0 instead of array[0] */
  treatArrayAsObject?: boolean,

  /** encode as ['foo'] instead of .foo */
  forceBrackets?: boolean,

  /** dont prepend $ */
  noDollar?: boolean
};

/**
 * encodes an array of nodes into a JSONPath
 * @param nodes nodes to encode
 * @param options encoding options
 * @returns JSONPath string
 * @example
 * const path = encodeJsonPath(['foo', 'bar', 5]);
 * path == '$.foo.bar[5]'; // true
 */
export function encodeJsonPath(nodes: (string | number)[], options: JsonPathOptions = {}): string {
  const { treatArrayAsObject = false, forceBrackets = false, noDollar = false } = options;

  let path = '';

  for (const node of nodes) {
    const nodeString = node.toString();
    const isNumberAccess = !treatArrayAsObject && numberPattern.test(nodeString);

    if (isNumberAccess) {
      path += `[${node}]`;
    }
    else {
      const encodeAsBracket = forceBrackets || nodeString.includes('.');

      if (encodeAsBracket) {
        path += `['${node}']`;
      }
      else {
        path += `.${node}`;
      }
    }
  }

  if (noDollar) {
    if (path.startsWith('[')) {
      return path;
    }

    return path.slice(1);
  }

  return `$${path}`;
}

/**
 * decodes a JSONPath into its nodes. Only supports child operator
 * @param path JSONPath string
 * @returns array of nodes
 * @example
 * decodeJsonPath('$.foo[2].bar[\'baz\']'); // ['foo', 2, 'bar', 'baz']
 */
export function decodeJsonPath(path: string): (string | number)[] {
  const matches = (path.trim()).matchAll(parsePattern);

  const nodes: (string | number)[] = [];

  for (const match of matches) {
    const { root, dot, bracket, index, error } = match.groups!;

    if (isDefined(error)) {
      throw new Error(`unexpected '${error[0]}' at index ${match.index}`);
    }

    const node = dot ?? bracket ?? (isDefined(index) ? parseInt(index) : undefined);

    if (isDefined(node)) {
      nodes.push(node);
    }
    else if (isUndefined(root)) {
      throw new Error(`something is wrong at index ${match.index}`);
    }
  }

  if ((nodes.length == 0) && (path != '$')) {
    throw new Error('invalid path');
  }

  return nodes;
}
