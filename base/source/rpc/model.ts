import type { Constructor, Record } from '#/types';
import { getRandomString } from '#/utils/random';

export type RpcConstructor<T extends Constructor> = T extends Constructor<any, infer R> ? Constructor<Promise<RpcRemote<InstanceType<T>>>, R> : never;
export type RpcFunction<T extends (...args: any) => any> = T extends (...args: infer Args) => infer R ? (...args: Args) => Promise<Awaited<R>> : never;
export type RpcObject<T extends Record> = { [P in keyof T]: T[P] extends (...args: any) => any ? RpcFunction<T[P]> : Promise<Awaited<T[P]>> };

export type RpcInput = ((...args: any) => any) | Record;

export type RpcRemote<T extends RpcInput = RpcInput> =
  T extends Constructor ? RpcConstructor<T> : T extends (...args: any) => any ? RpcFunction<T> : RpcObject<T>;

export type RpcMessageBase<Type extends string = string> = { type: Type, id: string, metadata?: any };

export type RpcMessageWithProxyIdBase<Type extends string = string> = RpcMessageBase<Type> & { proxyId: string };

export type RpcConnectMessage = RpcMessageBase<'connect'> & { name: string };

export type RpcApplyMessage = RpcMessageWithProxyIdBase<'apply'> & { path: PropertyKey[], args: RpcMessageValue[] };

export type RpcConstructMessage = RpcMessageWithProxyIdBase<'construct'> & { path: PropertyKey[], args: RpcMessageValue[] };

export type RpcGetMessage = RpcMessageWithProxyIdBase<'get'> & { path: PropertyKey[] };

export type RpcSetMessage = RpcMessageWithProxyIdBase<'set'> & { path: PropertyKey[], value: RpcMessageValue };

export type RpcReleaseProxyMessage = RpcMessageWithProxyIdBase<'release-proxy'>;

export type RpcResponseMessage = RpcMessageBase<'response'> & { value: RpcMessageValue };

export type RpcMessage = RpcConnectMessage | RpcApplyMessage | RpcConstructMessage | RpcGetMessage | RpcSetMessage | RpcReleaseProxyMessage | RpcResponseMessage;

export type RpcMessageRawValue = { type: 'raw', value: any };
export type RpcMessageProxyValue = { type: 'proxy', id: string, port?: MessagePort };
export type RpcMessageThrowValue = { type: 'throw', error: unknown };

export type RpcMessageValue = | RpcMessageRawValue | RpcMessageProxyValue | RpcMessageThrowValue;

export type RpcPostMessageArrayData = {
  value: RpcMessageValue[],
  transfer?: any[]
};

export type RpcPostMessageData = {
  value: RpcMessageValue,
  transfer?: any[]
};

export function createRpcMessage<Type extends RpcMessage['type']>(type: Type, message: Omit<Extract<RpcMessage, { type: Type }>, 'id' | 'type'>): Extract<RpcMessage, { type: Type }> {
  return {
    id: getRandomString(24),
    type,
    ...message
  } as Extract<RpcMessage, { type: Type }>;
}
