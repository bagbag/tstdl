import { isIterable } from '#/utils/iterable-helpers/is-iterable.js';
import { assertDefinedPass, isArray, isDefined, isString, isSymbol, isUndefined } from '#/utils/type-guards.js';

const numberPattern = /^\d+$/u;
const parsePattern = /(?:(?:^|\.)(?<dot>[^.[]+))|(?<root>^\$)|\[(?:(?:'(?<bracket>.+?)')|(?<index>\d+)|(?:Symbol\((?<symbol>.*)\)))\]|(?<error>.+?)/ug;

export type JsonPathNode = PropertyKey;
export type JsonPathInput = string | JsonPath | Iterable<JsonPathNode>;

export class JsonPath<T = any> implements Iterable<JsonPathNode> {
  private readonly _options: JsonPathOptions;
  private _path: string | undefined;
  private _nodes: readonly JsonPathNode[] | undefined;

  /** Json path as encoded string */
  get path(): string {
    if (isUndefined(this._path)) {
      this._path = encodeJsonPath(this._nodes!, this._options);
    }

    return this._path;
  }

  /** Json path as decoded array */
  get nodes(): readonly JsonPathNode[] {
    if (isUndefined(this._nodes)) {
      this._nodes = decodeJsonPath(this._path!);
    }

    return this._nodes;
  }

  static get ROOT(): JsonPath {
    return new JsonPath();
  }

  constructor(options?: JsonPathOptions);
  constructor(path: JsonPathInput, options?: JsonPathOptions);
  constructor(pathOrNodesOrOptions: JsonPathInput | JsonPathOptions = [], options: JsonPathOptions = {}) {
    this._options = options;

    if (isString(pathOrNodesOrOptions)) {
      this._path = pathOrNodesOrOptions;
    }
    else if (isArray<JsonPathNode>(pathOrNodesOrOptions)) {
      this._nodes = pathOrNodesOrOptions;
    }
    else if (pathOrNodesOrOptions instanceof JsonPath) {
      this._nodes = pathOrNodesOrOptions._nodes;
      this._path = pathOrNodesOrOptions._path;
    }
    else if (isIterable(pathOrNodesOrOptions)) {
      this._nodes = [...pathOrNodesOrOptions as Iterable<JsonPathNode>];
    }
    else {
      this._options = pathOrNodesOrOptions;
    }
  }

  static from(options?: JsonPathOptions): JsonPath;
  static from(path: JsonPathInput, options?: JsonPathOptions): JsonPath;
  static from(pathOrNodesOrOptions: JsonPathInput | JsonPathOptions = [], options: JsonPathOptions = {}): JsonPath {
    return new JsonPath(pathOrNodesOrOptions as JsonPathInput, options);
  }

  static isJsonPath(path: string): boolean {
    return isJsonPath(path);
  }

  /**
   * Add a property or index to current path
   * @param key
   * @returns new JsonPath instance
   */
  add<K extends keyof T>(key: K): JsonPath<T[K]> {
    return new JsonPath([...this.nodes, key], this._options);
  }

  /**
   * Updates options
   * @param options
   * @returns new JsonPath instance
   */
  options(options: JsonPathOptions): JsonPath {
    return new JsonPath(this.nodes, options);
  }

  *[Symbol.iterator](): Iterator<PropertyKey> {
    yield* this.nodes;
  }
}

export type JsonPathOptions = {
  /** Encode as array.0 instead of array[0] */
  treatArrayAsObject?: boolean,

  /** Encode as ['foo'] instead of .foo */
  forceBrackets?: boolean,

  /**
   * Prepend $
   * @default true
   */
  dollar?: boolean
};

export type JsonPathContext = {
  /** If path contains symbols, they are required in order to be mapped, otherwise they are created from global symbol registry */
  symbols?: symbol[]
};

export function isJsonPath(path: string): boolean {
  return parsePattern.test(path);
}

/**
 * Encodes an array of nodes into a JSONPath
 * @param nodes nodes to encode
 * @param options encoding options
 * @returns JSONPath string
 * @example
 * const path = encodeJsonPath(['foo', 'bar', 5]);
 * path == '$.foo.bar[5]'; // true
 */
export function encodeJsonPath(nodes: readonly JsonPathNode[], options: JsonPathOptions = {}): string {
  const { treatArrayAsObject = false, forceBrackets = false, dollar = true } = options;

  let path = '';

  for (const node of nodes) {
    const nodeIsSymbol = isSymbol(node);
    const nodeString = nodeIsSymbol ? `Symbol(${assertDefinedPass(node.description, 'only symbols with description can be encoded')})` : node.toString();
    const isNumberAccess = !treatArrayAsObject && numberPattern.test(nodeString);

    if (isNumberAccess || nodeIsSymbol) {
      path += `[${nodeString}]`;
    }
    else {
      const encodeAsBracket = forceBrackets || (nodeString == '$') || nodeString.includes('.');

      if (encodeAsBracket) {
        path += `['${node}']`;
      }
      else {
        path += `.${node}`;
      }
    }
  }

  if (dollar) {
    return `$${path}`;
  }

  if (path.startsWith('[')) {
    return path;
  }

  return path.slice(1);
}

/**
 * Decodes a JSONPath into its nodes. Only supports child operator
 * @param path JSONPath string
 * @returns array of nodes
 * @example
 * decodeJsonPath('$.foo[2].bar[\'baz\']'); // ['foo', 2, 'bar', 'baz']
 */
export function decodeJsonPath(path: string, context: JsonPathContext = {}): JsonPathNode[] {
  const matches = (path.trim()).matchAll(parsePattern);

  const nodes: JsonPathNode[] = [];

  let matchIndex = 0;
  for (const match of matches) {
    const { root, dot, bracket, index, symbol, error } = match.groups!;

    if (isDefined(error)) {
      throw new Error(`unexpected '${error[0]}' at index ${match.index}`);
    }

    const node = dot
      ?? bracket
      ?? (isDefined(index) ? parseInt(index, 10) : undefined)
      ?? (isDefined(symbol) ? getSymbol(symbol, context) : undefined);

    if (isDefined(node)) {
      if ((matchIndex == 0) && (node == '$')) {
        continue;
      }

      nodes.push(node);
    }
    else if (isUndefined(root)) {
      throw new Error(`something is wrong at index ${match.index}`);
    }

    matchIndex++;
  }

  if ((nodes.length == 0) && (path != '$')) {
    throw new Error('invalid path');
  }

  return nodes;
}

function getSymbol(symbolDescription: string, context: JsonPathContext): symbol {
  if (isDefined(context.symbols)) {
    for (const symbol of context.symbols) {
      if (symbol.description == symbolDescription) {
        return symbol;
      }
    }
  }

  return Symbol.for(symbolDescription);
}
