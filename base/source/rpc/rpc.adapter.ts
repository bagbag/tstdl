import type { NonPrimitive } from '#/serializer/types.js';
import type { RpcChannel } from './rpc.endpoint.js';

export type AdaptSourceResult<Data> = Data extends void ? (void | { data?: undefined, transfer?: any[] }) : { data: Data, transfer?: any[] };

export type RpcAdapterNonPrimitive = NonPrimitive<string, RpcAdapterNonPrimitiveData>;
export type RpcAdapterNonPrimitiveData = { channel: string, data: any };

export interface RpcAdapter<T extends object = any, Data = any, ChannelData = any, Req = any, Res = any> {
  name: string;

  adaptSource(value: T, channel: RpcChannel<ChannelData, Req, Res>): AdaptSourceResult<Data>;
  adaptTarget(data: Data, channel: RpcChannel<ChannelData, Req, Res>): T;
}
