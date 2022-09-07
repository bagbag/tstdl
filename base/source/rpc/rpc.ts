/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { NotImplementedError } from '#/error';
import type { Record } from '#/types';
import { hasOwnProperty } from '#/utils/object';
import { reflectMethods } from '#/utils/proxy';
import { getRandomString } from '#/utils/random';
import { isDefined, isUndefined } from '#/utils/type-guards';
import { filter } from 'rxjs';
import type { MessagePortRpcEndpointSource } from './adapters/message-port.rpc-endpoint';
import { MessagePortRpcEndpoint } from './adapters/message-port.rpc-endpoint';
import type { RpcInput, RpcMessage, RpcMessageValue, RpcPostMessageArrayData, RpcPostMessageData, RpcRemote } from './model';
import { createRpcMessage } from './model';
import { RpcEndpoint } from './rpc-endpoint';
import { RpcError, RpcRemoteError } from './rpc-error';

const transfers = new WeakMap<object, any[]>();
const proxyTargets = new WeakSet();

// eslint-disable-next-line @typescript-eslint/no-redeclare, @typescript-eslint/naming-convention
export const Rpc = {
  connect<T extends RpcInput>(endpointOrSource: RpcEndpoint | MessagePortRpcEndpointSource, id: string = 'default'): RpcRemote<T> {
    const endpoint = (endpointOrSource instanceof RpcEndpoint) ? endpointOrSource : new MessagePortRpcEndpoint(endpointOrSource);
    return createProxy<T>(endpoint, id);
  },

  expose(object: RpcInput, endpointOrSource: RpcEndpoint | MessagePortRpcEndpointSource, id: string = 'default'): void {
    const endpoint = (endpointOrSource instanceof RpcEndpoint) ? endpointOrSource : new MessagePortRpcEndpoint(endpointOrSource);
    expose(object, endpoint, id);
  },

  proxy<T extends object>(object: T): T {
    proxyTargets.add(object);
    return object;
  },

  transfer<T extends object>(object: T, transfer: any[]): T {
    transfers.set(object, transfer);
    return object;
  },

  isProxied(object: object): boolean {
    return proxyTargets.has(object);
  }
};

function createProxy<T extends object>(endpoint: RpcEndpoint, id: string, path: PropertyKey[] = []): RpcRemote<T> {
  class RpcProxy { }

  // eslint-disable-next-line prefer-const
  let proxy: RpcRemote<T>;

  const handlers: ProxyHandler<any> = {
    apply(_target: T, _this: any, args: any[]): any {
      const postMessageData = getPostMessageDataFromArray(args, endpoint);

      const message = createRpcMessage('apply', id, { path, args: postMessageData.value });
      return endpoint.request(message, postMessageData.transfer).then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
    },

    construct(_target: T, args: any[]): object {
      const postMessageData = getPostMessageDataFromArray(args, endpoint);

      const message = createRpcMessage('construct', id, { path, args: postMessageData.value });
      return endpoint.request(message, postMessageData.transfer).then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
    },

    get(_target: T, property: string | symbol): any {
      if (property == 'then') {
        if (path.length == 0) {
          return { then: () => proxy };
        }

        const message = createRpcMessage('get', id, { path });

        const resultValue = endpoint.request(message).then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
        return resultValue.then.bind(resultValue);
      }

      return createProxy(endpoint, id, [...path, property]);
    },

    set(_target: T, property: string | symbol, value: any): boolean {
      const postMessageData = getPostMessageData(value, endpoint);
      const message = createRpcMessage('set', id, { path: [...path, property], value: postMessageData.value });

      return endpoint.request(message, postMessageData.transfer).then((responseValue) => parseRpcMessageValue(responseValue, endpoint)) as unknown as boolean;
    }
  };

  for (const method of reflectMethods) {
    if (!hasOwnProperty(handlers, method)) {
      handlers[method] = () => {
        throw new Error(`${method} not supported on rpc proxies.`);
      };
    }
  }

  proxy = new Proxy(RpcProxy as any, handlers) as RpcRemote<T>;

  return proxy;
}

function expose(object: RpcInput, endpoint: RpcEndpoint, proxyId: string): void {
  endpoint.message$
    .pipe(filter((message) => message.proxyId == proxyId))
    .subscribe(async (message) => { // eslint-disable-line @typescript-eslint/no-misused-promises
      try {
        switch (message.type) {
          case 'get': {
            const { value } = deref(object, message.path);
            const postMessageData = getPostMessageData(await value, endpoint);

            await endpoint.respond(message.id, proxyId, postMessageData.value, postMessageData.transfer);
            break;
          }

          case 'set': {
            const { value } = deref(object, message.path, true);
            const result = Reflect.set(value, message.path[message.path.length - 1]!, parseRpcMessageValue(message.value, endpoint));
            const postMessageData = getPostMessageData(result, endpoint);

            await endpoint.respond(message.id, proxyId, postMessageData.value, postMessageData.transfer);
            break;
          }

          case 'apply': {
            const { parent, value } = deref(object, message.path);
            const result = await Reflect.apply(value, parent, parseRpcMessageValues(message.args, endpoint));
            const postMessageData = getPostMessageData(result, endpoint);

            await endpoint.respond(message.id, proxyId, postMessageData.value, postMessageData.transfer);
            break;
          }

          case 'construct': {
            const { value } = deref(object, message.path);
            const result = Reflect.construct(value, parseRpcMessageValues(message.args, endpoint));
            const postMessageData = getPostMessageData(Rpc.proxy(result), endpoint);

            await endpoint.respond(message.id, proxyId, postMessageData.value, postMessageData.transfer);
            break;
          }

          case 'release-proxy': {
            const target = endpoint.proxyIdTargets.get(message.proxyId)!;
            endpoint.proxyIdTargets.delete(message.proxyId);
            endpoint.proxyTargetIds.delete(target);

            break;
          }

          case 'response':
            // we do not handle responses here
            break;

          default:
            console.log('unsupported', message);
            throw new NotImplementedError(`Unsupported message type ${(message as RpcMessage).type}`);
        }
      }
      catch (error) {
        await endpoint.respond(message.id, proxyId, { type: 'throw', error });
      }
    });
}

function getPostMessageDataFromArray(values: any[], endpoint: RpcEndpoint): RpcPostMessageArrayData {
  const mappedValues = values.map((value) => getRpcMessageValue(value, endpoint));
  const transfer = values.flatMap((value) => transfers.get(value) ?? []);

  const messageValues = mappedValues.map((mappedValue) => mappedValue[0]);
  const additionalTransfers = mappedValues.flatMap((mappedValue) => mappedValue[1]);

  return { value: messageValues, transfer: [...transfer, ...additionalTransfers] };
}

function getPostMessageData(value: any, endpoint: RpcEndpoint): RpcPostMessageData {
  const [messageValue, additionalTransfers] = getRpcMessageValue(value, endpoint);
  const transfer = transfers.get(value) ?? [];

  return { value: messageValue, transfer: [...transfer, ...additionalTransfers] };
}

function getRpcMessageValue(value: any, endpoint: RpcEndpoint): [messageValue: RpcMessageValue, transfers: any[]] {
  if (proxyTargets.has(value)) {
    const id = getRandomString(16);

    if (endpoint.supportsTransfers) {
      const { port1, port2 } = new MessageChannel();

      const newEndpoint = new MessagePortRpcEndpoint(port1);
      expose(value, newEndpoint, id);

      return [{ type: 'proxy', id, port: port2 }, [port2]];
    }

    endpoint.proxyTargetIds.set(value, id);
    endpoint.proxyIdTargets.set(id, value);
    return [{ type: 'proxy', id }, []];
  }

  return [{ type: 'raw', value }, []];
}

function parseRpcMessageValues(values: RpcMessageValue[], endpoint: RpcEndpoint): any[] {
  return values.map((value) => parseRpcMessageValue(value, endpoint));
}

function parseRpcMessageValue(value: RpcMessageValue, endpoint: RpcEndpoint): any {
  switch (value.type) {
    case 'raw': {
      return value.value;
    }

    case 'throw': {
      const remoteError = new RpcRemoteError(value.error);
      console.error(remoteError);
      throw new RpcError('Received error from remote.', remoteError);
    }

    case 'proxy': {
      const proxyEndpoint = (isDefined(value.port)) ? new MessagePortRpcEndpoint(value.port) : endpoint;
      const proxy = createProxy(proxyEndpoint, value.id);

      if (isUndefined(value.port)) {
        endpoint.proxyIdTargets.set(value.id, proxy);
        endpoint.proxyTargetIds.set(proxy, value.id);
        endpoint.proxyFinalizationRegistry.register(proxy, { id: value.id, endpoint });
      }

      return proxy;
    }

    default:
      throw new Error(`Type ${(value as RpcMessageValue).type} not supported`);
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
