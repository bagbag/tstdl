import { ObservableFinalizationRegistry } from '#/memory/observable-finalization-registry';
import type { Observable } from 'rxjs';
import { filter, firstValueFrom } from 'rxjs';
import type { RpcMessage, RpcMessageValue, RpcResponseMessage } from './model';
import { createRpcMessage } from './model';

type ProxyFinalizationRegistryData = { id: string, endpoint: RpcEndpoint };

export abstract class RpcEndpoint {
  readonly proxyTargetIds: Map<object, string>;
  readonly proxyIdTargets: Map<string, object>;
  readonly proxyFinalizationRegistry: ObservableFinalizationRegistry<ProxyFinalizationRegistryData>;

  abstract readonly supportsTransfers: boolean;

  abstract readonly message$: Observable<RpcMessage>;

  constructor() {
    this.proxyTargetIds = new Map<object, string>();
    this.proxyIdTargets = new Map<string, object>();
    this.proxyFinalizationRegistry = new ObservableFinalizationRegistry<ProxyFinalizationRegistryData>();

    this.proxyFinalizationRegistry.finalize$.subscribe(async (data) => { // eslint-disable-line @typescript-eslint/no-misused-promises
      const message = createRpcMessage('release-proxy', data.id, {});
      await data.endpoint.postMessage(message);
    });
  }

  async request(message: RpcMessage, transfer?: any[]): Promise<RpcMessageValue> {
    const response$ = this.message$.pipe(
      filter((incomingMessage) => (incomingMessage.type == 'response') && (incomingMessage.id == message.id))
    );

    const $response = firstValueFrom(response$);
    await this.postMessage(message, transfer);
    const response = await $response;

    return (response as RpcResponseMessage).value;
  }

  async respond(id: string, proxyId: string, value: RpcMessageValue, transfer?: any[]): Promise<void> {
    const message: RpcResponseMessage = {
      id,
      proxyId,
      type: 'response',
      value
    };

    await this.postMessage(message, transfer);
  }

  abstract postMessage(data: any, transfer?: any[]): void | Promise<void>;
}
