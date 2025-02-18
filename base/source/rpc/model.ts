import type { SerializationOptions } from '#/serializer/types.js';
import type { Constructor, Record } from '#/types.js';

export type RpcConstructor<T extends Constructor> = T extends Constructor<any, infer R> ? Constructor<Promise<RpcRemote<InstanceType<T>>>, R> : never;
export type RpcFunction<T extends (...args: any) => any> = T extends (...args: infer Args) => infer R ? (...args: Args) => Promise<Awaited<R>> : never;
export type RpcObject<T extends Record> = { [P in keyof T]: T[P] extends (...args: any) => any ? RpcFunction<T[P]> : Promise<Awaited<T[P]>> };

export type RpcRemoteInput = ((...args: any) => any) | Record;

export type RpcRemote<T extends RpcRemoteInput = RpcRemoteInput> =
  T extends Constructor ? RpcConstructor<T> : T extends (...args: any) => any ? RpcFunction<T> : RpcObject<T>;

export type RpcMessageBase<Type extends string = string> = { type: Type };

export type RpcConnectMessage = RpcMessageBase<'connect'> & { name: string };

export type RpcControlRequestMessage = RpcConnectMessage;

export type RpcProxyApplyMessage = RpcMessageBase<'apply'> & { path: PropertyKey[], args: RpcValue[] };
export type RpcProxyConstructMessage = RpcMessageBase<'construct'> & { path: PropertyKey[], args: RpcValue[] };
export type RpcProxyGetMessage = RpcMessageBase<'get'> & { path: PropertyKey[] };
export type RpcProxySetMessage = RpcMessageBase<'set'> & { path: PropertyKey[], value: RpcValue };
export type RpcProxyRequestMessage = RpcProxyApplyMessage | RpcProxyConstructMessage | RpcProxyGetMessage | RpcProxySetMessage;

export type RpcMessageRawValue = { type: 'raw', value: any };
export type RpcMessageSerializedValue = { type: 'serialized', value: any, options?: SerializationOptions };
export type RpcMessageProxyValue = { type: 'proxy', channel: string };
export type RpcMessageAdapterValue = { type: 'adapter', adapter: string, channel: string, data: any };
export type RpcMessageThrowValue = { type: 'throw', error: unknown };

export type RpcValue = RpcMessageRawValue | RpcMessageSerializedValue | RpcMessageProxyValue | RpcMessageAdapterValue | RpcMessageThrowValue;

export type RpcPostMessageArrayData = {
  value: RpcValue[],
  transfer?: any[]
};

export type RpcPostMessageData = {
  value: RpcValue,
  transfer?: any[]
};
