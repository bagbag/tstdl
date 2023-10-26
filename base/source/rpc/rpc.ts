/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */


import { NotFoundError } from '#/errors/not-found.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
import { NotSupportedError } from '#/errors/not-supported.error.js';
import type { NonPrimitive, SerializationOptions, SerializationReplacer } from '#/serializer/index.js';
import { deserialize, registerSerializer, serialize } from '#/serializer/index.js';
import type { Record, TypedOmit } from '#/types.js';
import { valueOfType } from '#/utils/helpers.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import { reflectMethods } from '#/utils/proxy.js';
import { _throw, deferThrow } from '#/utils/throw.js';
import { assert, isDefined, isUndefined } from '#/utils/type-guards.js';
import type { RpcControlRequestMessage, RpcMessageAdapterValue, RpcMessageProxyValue, RpcPostMessageArrayData, RpcPostMessageData, RpcProxyRequestMessage, RpcRemote, RpcRemoteInput, RpcValue } from './model.js';
import type { RpcAdapter, RpcAdapterNonPrimitive, RpcAdapterNonPrimitiveData } from './rpc.adapter.js';
import type { RpcChannel, RpcEndpoint } from './rpc.endpoint.js';
import { RpcError, RpcRemoteError } from './rpc.error.js';

type SerializationData = Record & {
  rpcEndpoint: RpcEndpoint,
  transfer?: any[]
};

const markedTransfers = new WeakMap<object, any[]>();
const serializationTargets = new WeakMap<object, SerializationOptions | undefined>();
const adapters = new Map<string, RpcAdapter>();
const adapterTargets = new WeakMap<WeakKey, RpcAdapter>();
const proxyTargets = new WeakSet();
const exposings = new Map<string, RpcRemoteInput>();

const channelFinalizationRegistry = new FinalizationRegistry<{ channel: RpcChannel }>((data) => data.channel.close());

class RpcProxy { }

// eslint-disable-next-line @typescript-eslint/no-redeclare, @typescript-eslint/naming-convention
export const Rpc = {
  listen(endpoint: RpcEndpoint): void {
    const controlChannel = endpoint.getChannel<never, RpcControlRequestMessage, unknown>('control');

    controlChannel.request$.subscribe(async ({ id: messageId, data: message }) => { // eslint-disable-line @typescript-eslint/no-misused-promises
      switch (message.type) {
        case 'connect': {
          try {
            const exposing = exposings.get(message.name);

            if (isUndefined(exposing)) {
              throw new NotFoundError(`Could not connect to "${message.name}" as nothing with that name is exposed.`);
            }

            const value = getAdapterOrProxy(exposing, endpoint);

            await controlChannel.respond(messageId, value);
          }
          catch (error) {
            await controlChannel.respond(messageId, { type: 'throw', error });
          }

          break;
        }

        default:
          throw new NotSupportedError(`Message type ${message.type as string} not supported in listen.`);
      }
    });
  },

  async connect<T extends RpcRemoteInput>(endpoint: RpcEndpoint, name: string = 'default'): Promise<RpcRemote<T>> {
    const channel = endpoint.getOrOpenChannel<never, RpcControlRequestMessage, RpcValue>('control');
    const response = await channel.request({ type: 'connect', name });
    assert((response.type == 'proxy') || (response.type == 'adapter') || (response.type == 'throw'), 'Rpc connect must result in proxy, adapter or throw.');

    return parseRpcMessageValue(response, endpoint);
  },

  expose(object: RpcRemoteInput, name: string = 'default'): void {
    exposings.set(name, object);
  },

  registerAdapter<T extends object, Data>(adapter: RpcAdapter<T, Data>): void {
    const adapterName = `RpcAdapter:${adapter.name}`;
    adapters.set(adapterName, adapter);

    const klass = {
      [adapterName]: class { }
    }[adapterName]!;

    registerSerializer<any, RpcAdapterNonPrimitiveData>(
      klass,
      klass.name,
      () => _throw(new NotSupportedError('Serialization not supported for rpc adapter.')),
      ({ channel, data }, _, { rpcEndpoint }: SerializationData) => adapter.adaptTarget(data, rpcEndpoint.getChannel(channel))
    );
  },

  /**
   * mark object for proxy forward
   * @param object object to forward as proxy
   * @param root if object is a child of the actual passed value (to function calls, returns or whatever), this must be set to to mark the parent for serialization (required for children proxies)
   * @returns
   */
  proxy<T extends object>(object: T, root?: object): T {
    proxyTargets.add(object);

    if (isDefined(root)) {
      Rpc.serialize(root);
    }

    return object;
  },

  transfer<T extends object>(object: T, transfer: any[]): T {
    const existingTransfers = markedTransfers.get(object);
    markedTransfers.set(object, isDefined(existingTransfers) ? [...existingTransfers, ...transfer] : transfer);

    return object;
  },

  serialize<T extends object>(object: T, options?: SerializationOptions): T {
    serializationTargets.set(object, options);
    return object;
  },

  adapt<T extends object>(object: T, adapter: RpcAdapter<T>, root?: object): T {
    adapterTargets.set(object, adapter);

    if (isDefined(root)) {
      Rpc.serialize(root);
    }

    return object;
  },

  isProxied(object: object): boolean {
    return proxyTargets.has(object);
  }
};

function createProxy<T extends object>(channel: RpcChannel<never, RpcProxyRequestMessage, RpcValue>, path: PropertyKey[] = []): RpcRemote<T> {
  // eslint-disable-next-line prefer-const
  let proxy: RpcRemote<T>;

  const { endpoint } = channel;

  const handlers: ProxyHandler<any> = {
    apply(_target: T, _this: any, args: any[]): any {
      const postMessageData = getPostMessageDataFromArray(args, endpoint);
      return channel
        .request({ type: 'apply', path, args: postMessageData.value }, postMessageData.transfer)
        .then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
    },

    construct(_target: T, args: any[]): object {
      const postMessageData = getPostMessageDataFromArray(args, endpoint);
      return channel
        .request({ type: 'construct', path, args: postMessageData.value }, postMessageData.transfer)
        .then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
    },

    get(_target: T, property: string | symbol): any {
      if (property == 'then') {
        if (path.length == 0) {
          return { then: () => proxy };
        }

        const resultValue = channel.request({ type: 'get', path }).then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
        return resultValue.then.bind(resultValue);
      }

      return createProxy(channel, [...path, property]);
    },

    set(_target: T, property: string | symbol, value: any): boolean {
      const postMessageData = getPostMessageData(value, endpoint);
      return channel
        .request({ type: 'set', path: [...path, property], value: postMessageData.value }, postMessageData.transfer)
        .then((responseValue) => parseRpcMessageValue(responseValue, endpoint)) as unknown as boolean;
    },

    getPrototypeOf(): object | null {
      return null;
    }
  };

  for (const method of reflectMethods) {
    if (!hasOwnProperty(handlers, method)) {
      handlers[method] = deferThrow(() => new NotSupportedError(`${method} not supported on rpc proxies.`));
    }
  }

  return new Proxy(RpcProxy as any, handlers) as RpcRemote<T>;
}

function exposeObject(object: RpcRemoteInput, channel: RpcChannel<never, RpcProxyRequestMessage, RpcValue>): void {
  const { endpoint } = channel;

  channel.request$.subscribe(async ({ id: messageId, data: message }) => { // eslint-disable-line @typescript-eslint/no-misused-promises
    try {
      switch (message.type) {
        case 'get': {
          const { value } = deref(object, message.path);
          const postMessageData = getPostMessageData(await value, endpoint);

          await channel.respond(messageId, postMessageData.value, postMessageData.transfer);
          break;
        }

        case 'set': {
          const { value } = deref(object, message.path, true);
          const result = Reflect.set(value, message.path[message.path.length - 1]!, parseRpcMessageValue(message.value, channel.endpoint));
          const postMessageData = getPostMessageData(result, endpoint);

          await channel.respond(messageId, postMessageData.value, postMessageData.transfer);
          break;
        }

        case 'apply': {
          const { parent, value } = deref(object, message.path);
          const result = await Reflect.apply(value, parent, parseRpcMessageValues(message.args, channel.endpoint));
          const postMessageData = getPostMessageData(result, endpoint);

          await channel.respond(messageId, postMessageData.value, postMessageData.transfer);
          break;
        }

        case 'construct': {
          const { value } = deref(object, message.path);
          const result: object = Reflect.construct(value, parseRpcMessageValues(message.args, channel.endpoint));
          const postMessageData = getPostMessageData(Rpc.proxy(result), endpoint);

          await channel.respond(messageId, postMessageData.value, postMessageData.transfer);
          break;
        }

        default:
          throw new NotImplementedError(`Unsupported message type ${(message as RpcProxyRequestMessage).type}.`);
      }
    }
    catch (error) {
      await channel.respond(messageId, { type: 'throw', error });
    }
  });
}

function getPostMessageDataFromArray(values: any[], endpoint: RpcEndpoint): RpcPostMessageArrayData {
  const messageValues = values.map((value) => getRpcMessageValue(value, endpoint));
  const transfer = values.flatMap((value) => markedTransfers.get(value) ?? []);

  return { value: messageValues, transfer };
}

function getPostMessageData(value: any, endpoint: RpcEndpoint): RpcPostMessageData {
  const messageValue = getRpcMessageValue(value, endpoint);
  const transfer = markedTransfers.get(value);

  return { value: messageValue, transfer };
}

function getAdapterOrProxy(exposing: RpcRemoteInput, endpoint: RpcEndpoint): RpcMessageAdapterValue | RpcMessageProxyValue {
  return adapterTargets.has(exposing)
    ? createAdapterValue(exposing, adapterTargets.get(exposing)!, endpoint)
    : createProxyValue(exposing, endpoint);
}

function getRpcMessageValue(value: any, endpoint: RpcEndpoint): RpcValue {
  const adapter = adapterTargets.get(value);
  if (isDefined(adapter)) {
    return createAdapterValue(value, adapter, endpoint);
  }

  if (proxyTargets.has(value)) {
    return createProxyValue(value, endpoint);
  }

  if (serializationTargets.has(value)) {
    const options = serializationTargets.get(value);
    const proxyReplacer = getRpcProxySerializationReplacer(endpoint);

    const serialized = serialize(value, { ...options, replacers: [proxyReplacer, rpcAdapterReplacer, ...options?.replacers ?? []], data: { ...options?.data, rpcEndpoint: endpoint } satisfies SerializationData });

    return { type: 'serialized', value: serialized, options };
  }

  return { type: 'raw', value };
}

function createProxyValue(value: object, endpoint: RpcEndpoint): RpcMessageProxyValue {
  const channel = endpoint.openChannel<never, RpcProxyRequestMessage, RpcValue>();
  exposeObject(value, channel);

  return { type: 'proxy', channel: channel.id };
}

function createAdapterValue(value: object, adapter: RpcAdapter, endpoint: RpcEndpoint): RpcMessageAdapterValue {
  const channel = endpoint.openChannel();

  const { data, transfer } = adapter.adaptSource(value, channel) ?? {}; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

  if (isDefined(transfer)) {
    for (const transferValue of transfer) {
      Rpc.transfer(value, transferValue);
    }
  }

  return { type: 'adapter', adapter: `RpcAdapter:${adapter.name}`, channel: channel.id, data };
}

function parseRpcMessageValues(values: RpcValue[], endpoint: RpcEndpoint): any[] {
  return values.map((value) => parseRpcMessageValue(value, endpoint));
}

function parseRpcMessageValue(value: RpcValue, endpoint: RpcEndpoint): any {
  switch (value.type) {
    case 'raw': {
      return value.value;
    }

    case 'serialized': {
      return deserialize(value.value, { ...value.options, data: { ...value.options?.data, rpcEndpoint: endpoint } satisfies SerializationData });
    }

    case 'throw': {
      const remoteError = new RpcRemoteError(value.error);
      throw new RpcError(`Received error from remote: ${remoteError.message}`, remoteError);
    }

    case 'proxy': {
      const channel = endpoint.getChannel<never, RpcProxyRequestMessage, RpcValue>(value.channel);
      const proxy = createProxy(channel);

      channelFinalizationRegistry.register(proxy, { channel });

      return proxy;
    }

    case 'adapter': {
      const channel = endpoint.getChannel(value.channel);
      const adapter = adapters.get(value.adapter);

      if (isUndefined(adapter)) {
        throw new NotSupportedError(`No adapter registration for "${value.adapter}" found.`);
      }

      const adaptedValue = adapter.adaptTarget(value.data, channel);

      channelFinalizationRegistry.register(adaptedValue, { channel });

      return adaptedValue;
    }

    default:
      throw new Error(`Type ${(value as RpcValue).type} not supported`);
  }
}

function deref(object: any, path: PropertyKey[], skipLast: boolean = false): { parent: any, value: any } {
  let parent: any;
  let value = object;

  const end = skipLast ? path.length - 1 : path.length;

  for (let i = 0; i < end; i++) {
    const segment = path[i]!;
    const newValue = (value as Record)[segment];
    parent = value;
    value = newValue;
  }

  return { parent, value };
}

/* serialization */

type RpcProxyNonPrimitive = NonPrimitive<'RpcProxy', RpcProxyNonPrimitiveData>;
type RpcProxyNonPrimitiveData = TypedOmit<RpcMessageProxyValue, 'type'>;

registerSerializer<RpcProxy, RpcProxyNonPrimitiveData>(
  RpcProxy,
  'RpcProxy',
  () => _throw(new NotSupportedError('Serialization not supported for rpc proxy.')),
  (data, _, { rpcEndpoint }: { rpcEndpoint: RpcEndpoint }) => parseRpcMessageValue({ type: 'proxy', ...data }, rpcEndpoint)
);

function getRpcProxySerializationReplacer(endpoint: RpcEndpoint): SerializationReplacer {
  function rpcProxySerializationReplacer(value: any): RpcProxyNonPrimitive {
    if (!proxyTargets.has(value)) {
      return value;
    }

    const proxy = createProxyValue(value, endpoint);

    return { '<RpcProxy>': valueOfType<RpcProxyNonPrimitiveData>({ channel: proxy.channel }) };
  }

  return rpcProxySerializationReplacer;
}

function rpcAdapterReplacer(value: any, serializationData: Record | undefined): RpcAdapterNonPrimitive {
  const adapter = adapterTargets.get(value);

  if (isUndefined(adapter)) {
    return value;
  }

  const channel = (serializationData as SerializationData).rpcEndpoint.openChannel();
  const { data, transfer } = adapter.adaptSource(value, channel) ?? {}; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

  if (isDefined(transfer)) {
    if (isDefined((serializationData as SerializationData).transfer)) {
      (serializationData as SerializationData).transfer!.push(...transfer);
    }
    else {
      (serializationData as SerializationData).transfer = transfer;
    }
  }

  return { [`<RpcAdapter:${adapter.name}>`]: valueOfType<RpcAdapterNonPrimitiveData>({ channel: channel.id, data }) };
}
