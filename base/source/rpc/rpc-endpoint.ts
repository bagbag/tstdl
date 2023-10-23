import type { Observable } from 'rxjs';
import { filter } from 'rxjs';

import type { RpcMessage, RpcMessageValue, RpcResponseMessage } from './model.js';


export abstract class RpcEndpoint {
  abstract readonly supportsTransfers: boolean;

  abstract readonly message$: Observable<RpcMessage>;

  async request(message: RpcMessage, transfer?: any[]): Promise<RpcMessageValue> {
    const $response = getResponsePromise(this.message$, message.id);
    await this.postMessage(message, transfer);
    const response = await $response;

    return response.value;
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

async function getResponsePromise(message$: Observable<RpcMessage>, messageId: string): Promise<RpcResponseMessage> {
  const response$ = message$.pipe(
    filter((incomingMessage): incomingMessage is RpcResponseMessage => (incomingMessage.type == 'response') && (incomingMessage.id == messageId))
  );

  return new Promise<RpcResponseMessage>((resolve, reject) => {
    const subscription = response$.subscribe({
      next(value) {
        resolve(value);
        subscription.unsubscribe();
      },
      complete() {
        reject(new Error('RpcEndpoint was closed while waiting for response.'));
      }
    });
  });
}
