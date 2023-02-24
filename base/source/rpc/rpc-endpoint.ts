import type { Observable } from 'rxjs';
import { filter, firstValueFrom } from 'rxjs';
import type { RpcMessage, RpcMessageValue, RpcResponseMessage } from './model.js';


export abstract class RpcEndpoint {
  abstract readonly supportsTransfers: boolean;

  abstract readonly message$: Observable<RpcMessage>;

  async request(message: RpcMessage, transfer?: any[]): Promise<RpcMessageValue> {
    const response$ = this.message$.pipe(
      filter((incomingMessage) => (incomingMessage.type == 'response') && (incomingMessage.id == message.id))
    );

    const $response = firstValueFrom(response$);
    await this.postMessage(message, transfer);
    const response = await $response;

    return (response as RpcResponseMessage).value;
  }

  async respond(id: string, value: RpcMessageValue, transfer?: any[]): Promise<void> {
    const message: RpcResponseMessage = {
      id,
      type: 'response',
      value
    };

    await this.postMessage(message, transfer);
  }

  abstract start(): void;

  abstract close(): void;

  abstract postMessage(data: any, transfer?: any[]): void | Promise<void>;
}
