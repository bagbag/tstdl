import { reflectionRegistry } from '#/reflection';
import type { AbstractConstructor } from '#/types';
import { assertDefinedPass } from '#/utils/type-guards';
import type { InjectionToken } from './token';
import { getTokenName } from './token';

export type ResolveChainNodeBase<Type extends string> = {
  type: Type
};

export type ResolveChainNode =
  | ResolveChainNodeBase<'token'> & { token: InjectionToken }
  | ResolveChainNodeBase<'parameter'> & { constructor: AbstractConstructor, index: number, token: InjectionToken }
  | ResolveChainNodeBase<'property'> & { constructor: AbstractConstructor, property: PropertyKey, token: InjectionToken };

export class ResolveChain {
  readonly nodes: readonly ResolveChainNode[];

  get length(): number {
    return this.nodes.length;
  }

  constructor(nodes?: ResolveChainNode[]) {
    this.nodes = nodes ?? [];
  }

  static startWith(token: InjectionToken): ResolveChain {
    const chain = new ResolveChain();
    return chain.addToken(token);
  }

  addToken(token: InjectionToken): ResolveChain {
    const node: ResolveChainNode = { type: 'token', token };
    return new ResolveChain([...this.nodes, node]);
  }

  addParameter(constructor: AbstractConstructor, index: number, token: InjectionToken): ResolveChain {
    const node: ResolveChainNode = { type: 'parameter', constructor, index, token };
    return new ResolveChain([...this.nodes, node]);
  }

  addProperty(constructor: AbstractConstructor, property: PropertyKey, token: InjectionToken): ResolveChain {
    const node: ResolveChainNode = { type: 'property', constructor, property, token };
    return new ResolveChain([...this.nodes, node]);
  }

  format(): string {
    let chainString = '';

    for (const node of this.nodes) {
      const tokenName = getTokenName(node.token);

      switch (node.type) {
        case 'token':
          chainString += `\n    -> ${tokenName}`;
          break;

        case 'parameter':
          const metadata = reflectionRegistry.getMetadata(node.constructor);
          const prefix = '_, '.repeat(node.index);
          const suffix = ', _'.repeat(assertDefinedPass(metadata?.parameters, 'missing parameters metadata').length - node.index - 1);
          chainString += `(${prefix}${tokenName}${suffix})`;
          break;

        case 'property':
          const constructorName = getTokenName(node.constructor);
          const key = getPropertyKeyString(node.property);
          chainString += `\n    -> ${constructorName}[${key}]: ${tokenName}`;
          break;

        default:
          throw new Error(`unknown chain node type ${(node as ResolveChainNode).type}`);
      }
    }

    return chainString;
  }

  truncate(tokenCount: number): ResolveChain {
    const truncatedChain: ResolveChainNode[] = [];

    let counter = 0;
    for (let i = this.nodes.length - 1; (i >= 0) && (counter < tokenCount); i--) {
      const node = this.nodes[i]!;

      truncatedChain.unshift(node);

      if (node.type == 'token') {
        counter++;
      }
    }

    return new ResolveChain(truncatedChain);
  }
}

function getPropertyKeyString(key: PropertyKey): string {
  switch (typeof key) {
    case 'number':
    case 'symbol':
      return key.toString();

    case 'string':
      return `'${key}'`;

    default:
      throw new Error(`unsupported key type ${typeof key}`);
  }
}
