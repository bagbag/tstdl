import type { Constructor, Record, TypedOmit } from '#/types';
import { getRandomString } from '#/utils/random';

export type RpcConstructor<T extends Constructor> = T extends Constructor<any, infer R> ? Constructor<Promise<RpcRemote<InstanceType<T>>>, R> : never;
export type RpcFunction<T extends (...args: any) => any> = T extends (...args: infer Args) => infer R ? (...args: Args) => Promise<Awaited<R>> : never;
export type RpcObject<T extends Record> = { [P in keyof T]: T[P] extends (...args: any) => any ? RpcFunction<T[P]> : Promise<Awaited<T[P]>> };

export type RpcInput = ((...args: any) => any) | Record;

export type RpcRemote<T extends RpcInput = RpcInput> =
  T extends Constructor ? RpcConstructor<T> : T extends (...args: any) => any ? RpcFunction<T> : RpcObject<T>;

type RpcMessageBase<Type extends string> = { id: string, proxyId: string, type: Type, metadata?: any };

export type RpcApplyMessage = RpcMessageBase<'apply'> & { path: PropertyKey[], args: RpcMessageValue[] };

export type RpcConstructMessage = RpcMessageBase<'construct'> & { path: PropertyKey[], args: RpcMessageValue[] };

export type RpcGetMessage = RpcMessageBase<'get'> & { path: PropertyKey[] };

export type RpcSetMessage = RpcMessageBase<'set'> & { path: PropertyKey[], value: RpcMessageValue };

export type RpcReleaseProxyMessage = RpcMessageBase<'release-proxy'>;

export type RpcResponseMessage = RpcMessageBase<'response'> & { value: RpcMessageValue };

export type RpcMessage = RpcApplyMessage | RpcConstructMessage | RpcGetMessage | RpcSetMessage | RpcReleaseProxyMessage | RpcResponseMessage;

export type RpcMessageValue =
  | { type: 'raw', value: any }
  | { type: 'proxy', id: string, port?: MessagePort }
  | { type: 'throw', error: unknown };

export type RpcPostMessageArrayData = {
  value: RpcMessageValue[],
  transfer?: any[]
};

export type RpcPostMessageData = {
  value: RpcMessageValue,
  transfer?: any[]
};

export function createRpcMessage<Type extends RpcMessage['type']>(type: Type, proxyId: string, message: TypedOmit<Extract<RpcMessage, { type: Type }>, 'id' | 'type' | 'proxyId'>): Extract<RpcMessage, { type: Type }> {
  return {
    id: getRandomString(16),
    type,
    proxyId,
    ...message
  } as Extract<RpcMessage, { type: Type }>;
}
