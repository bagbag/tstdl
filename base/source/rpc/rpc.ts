/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { NotImplementedError } from '#/error/not-implemented.error';
import type { Record } from '#/types';
import { hasOwnProperty } from '#/utils/object';
import { reflectMethods } from '#/utils/proxy';
import { getRandomString } from '#/utils/random';
import { assert, isDefined } from '#/utils/type-guards';
import { filter, Subject, takeUntil } from 'rxjs';
import type { MessagePortRpcEndpointSource } from './adapters/message-port.rpc-endpoint';
import { MessagePortRpcEndpoint } from './adapters/message-port.rpc-endpoint';
import type { RpcConnectMessage, RpcInput, RpcMessage, RpcMessageProxyValue, RpcMessageValue, RpcMessageWithProxyIdBase, RpcPostMessageArrayData, RpcPostMessageData, RpcRemote } from './model';
import { createRpcMessage } from './model';
import { RpcEndpoint } from './rpc-endpoint';
import { RpcError, RpcRemoteError } from './rpc-error';

type ProxyFinalizationRegistryData = { id: string, endpoint: RpcEndpoint };

const transfers = new WeakMap<object, any[]>();
const proxyTargets = new WeakSet();

const proxyFinalizationRegistry = new FinalizationRegistry<ProxyFinalizationRegistryData>(async (data) => { // eslint-disable-line @typescript-eslint/no-misused-promises
  const message = createRpcMessage('release-proxy', { proxyId: data.id });
  await data.endpoint.postMessage(message);
});

// eslint-disable-next-line @typescript-eslint/no-redeclare, @typescript-eslint/naming-convention
export const Rpc = {
  async connect<T extends RpcInput>(endpointOrSource: RpcEndpoint | MessagePortRpcEndpointSource, name: string = 'default'): Promise<RpcRemote<T>> {
    const endpoint = (endpointOrSource instanceof RpcEndpoint) ? endpointOrSource : new MessagePortRpcEndpoint(endpointOrSource);

    const connectMessage = createRpcMessage('connect', { name });
    const response = await endpoint.request(connectMessage);

    assert(response.type == 'proxy', 'Rpc connect must result in proxy.');

    return parseRpcMessageValue(response, endpoint);
  },

  expose(object: RpcInput, endpointOrSource: RpcEndpoint | MessagePortRpcEndpointSource, name: string = 'default'): void {
    const endpoint = (endpointOrSource instanceof RpcEndpoint) ? endpointOrSource : new MessagePortRpcEndpoint(endpointOrSource);
    exposeConnectable(object, endpoint, name);
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

      const message = createRpcMessage('apply', { proxyId: id, path, args: postMessageData.value });
      return endpoint.request(message, postMessageData.transfer).then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
    },

    construct(_target: T, args: any[]): object {
      const postMessageData = getPostMessageDataFromArray(args, endpoint);

      const message = createRpcMessage('construct', { proxyId: id, path, args: postMessageData.value });
      return endpoint.request(message, postMessageData.transfer).then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
    },

    get(_target: T, property: string | symbol): any {
      if (property == 'then') {
        if (path.length == 0) {
          return { then: () => proxy };
        }

        const message = createRpcMessage('get', { proxyId: id, path });

        const resultValue = endpoint.request(message).then((responseValue) => parseRpcMessageValue(responseValue, endpoint));
        return resultValue.then.bind(resultValue);
      }

      return createProxy(endpoint, id, [...path, property]);
    },

    set(_target: T, property: string | symbol, value: any): boolean {
      const postMessageData = getPostMessageData(value, endpoint);
      const message = createRpcMessage('set', { proxyId: id, path: [...path, property], value: postMessageData.value });

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

  proxyFinalizationRegistry.register(proxy, { id, endpoint });

  return proxy;
}

function exposeConnectable(object: RpcInput, endpoint: RpcEndpoint, name: string): void {
  endpoint.message$
    .pipe(
      filter((message): message is RpcConnectMessage => message.type == 'connect'),
      filter((message) => message.name == name)
    )
    .subscribe(async (message) => { // eslint-disable-line @typescript-eslint/no-misused-promises
      try {
        const [proxy, transfer] = createProxyValue(object, endpoint);
        await endpoint.respond(message.id, proxy, transfer);
      }
      catch (error) {
        await endpoint.respond(message.id, { type: 'throw', error });
      }
    });
}

function exposeObject(object: RpcInput, endpoint: RpcEndpoint, proxyId: string): void {
  const abortSubject = new Subject<void>();

  endpoint.message$
    .pipe(
      takeUntil(abortSubject),
      filter((message) => ((message as Partial<RpcMessageWithProxyIdBase>).proxyId == proxyId))
    )
    .subscribe(async (message) => { // eslint-disable-line @typescript-eslint/no-misused-promises
      try {
        switch (message.type) {
          case 'get': {
            const { value } = deref(object, message.path);
            const postMessageData = getPostMessageData(await value, endpoint);

            await endpoint.respond(message.id, postMessageData.value, postMessageData.transfer);
            break;
          }

          case 'set': {
            const { value } = deref(object, message.path, true);
            const result = Reflect.set(value, message.path[message.path.length - 1]!, parseRpcMessageValue(message.value, endpoint));
            const postMessageData = getPostMessageData(result, endpoint);

            await endpoint.respond(message.id, postMessageData.value, postMessageData.transfer);
            break;
          }

          case 'apply': {
            const { parent, value } = deref(object, message.path);
            const result = await Reflect.apply(value, parent, parseRpcMessageValues(message.args, endpoint));
            const postMessageData = getPostMessageData(result, endpoint);

            await endpoint.respond(message.id, postMessageData.value, postMessageData.transfer);
            break;
          }

          case 'construct': {
            const { value } = deref(object, message.path);
            const result = Reflect.construct(value, parseRpcMessageValues(message.args, endpoint));
            const [proxy, transfer] = createProxyValue(result, endpoint);

            await endpoint.respond(message.id, proxy, transfer);
            break;
          }

          case 'release-proxy': {
            abortSubject.next();
            break;
          }

          case 'response':
          case 'connect':
            // we do not handle these here
            break;

          default:
            throw new NotImplementedError(`Unsupported message type ${(message as RpcMessage).type}`);
        }
      }
      catch (error) {
        await endpoint.respond(message.id, { type: 'throw', error });
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
    return createProxyValue(value, endpoint);
  }

  return [{ type: 'raw', value }, []];
}

function createProxyValue(value: any, endpoint: RpcEndpoint): [messageValue: RpcMessageProxyValue, transfers: any[]] {
  const id = getRandomString(24);

  if (endpoint.supportsTransfers) {
    const { port1, port2 } = new MessageChannel();

    const newEndpoint = new MessagePortRpcEndpoint(port1);
    exposeObject(value, newEndpoint, id);

    return [{ type: 'proxy', id, port: port2 }, [port2]];
  }

  return [{ type: 'proxy', id }, []];
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
      return createProxy(proxyEndpoint, value.id);
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
