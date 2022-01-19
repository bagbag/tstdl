import { hasOwnProperty } from '#/utils/object';
import { isFunction, isObject, isString } from '#/utils/type-guards';
import type { InjectionToken, ResolveChain, ResolveChainNode, ResolveChainParameterNode } from './types';

export function getTokenName(token: InjectionToken | undefined): string {
  return isFunction(token)
    ? token.name
    : isString(token)
      ? `"${token}"`
      : String(token);
}

export function getChainString(chain: ResolveChain): string {
  let chainString = '';

  for (const node of chain) {
    if (isResolveChainParameterNode(node)) {
      chainString += `(${'_, '.repeat(node.index)}${getTokenName(node.token)}${', _'.repeat(node.parametersCount - node.index - 1)})`;
    }
    else {
      chainString += `\n  -> ${getTokenName(node)}`;
    }
  }

  return chainString;
}

export function isResolveChainParameterNode(node: ResolveChainNode): node is ResolveChainParameterNode {
  return isObject(node)
    && hasOwnProperty(node as ResolveChainParameterNode, 'token')
    && hasOwnProperty(node as ResolveChainParameterNode, 'index')
    && hasOwnProperty(node as ResolveChainParameterNode, 'parametersCount');
}
