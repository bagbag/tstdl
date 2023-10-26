import { defer, filter, map, type Observable } from 'rxjs';

export type RpcChannelDataMessage<T> = { type: 'data', data: T };
export type RpcChannelRequestMessage<T> = { type: 'request', id: string, data: T };
export type RpcChannelResponseMessage<T> = { type: 'response', id: string, data: T };
export type RpcChannelMessage<Data, Req, Res> = RpcChannelDataMessage<Data> | RpcChannelRequestMessage<Req> | RpcChannelResponseMessage<Res>;

export type RpcChannelRequest<T> = { id: string, data: T };

export abstract class RpcEndpoint {
  abstract openChannel<Data, Req, Res>(id?: string): RpcChannel<Data, Req, Res>;

  abstract getChannel<Data, Req, Res>(id: string): RpcChannel<Data, Req, Res>;

  abstract getOrOpenChannel<Data, Req, Res>(id: string): RpcChannel<Data, Req, Res>;

  abstract close(): void;
}

/**
 * @template Data - type of data-messages
 * @template Req - type of request-messages
 * @template Res - type of response-messages
 */
export abstract class RpcChannel<Data = unknown, Req = unknown, Res = unknown> {
  readonly id: string;
  readonly message$: Observable<Data>;
  readonly request$: Observable<RpcChannelRequest<Req>>;

  protected abstract readonly channelMessages$: Observable<RpcChannelMessage<Data, Req, Res>>;

  abstract readonly supportsTransfers: boolean;
  abstract readonly endpoint: RpcEndpoint;

  constructor(id: string) {
    this.id = id;

    this.message$ = defer(() => this.channelMessages$.pipe(
      filter((message): message is RpcChannelDataMessage<Data> => message.type == 'data'),
      map((message) => message.data)
    ));

    this.request$ = defer(() => this.channelMessages$.pipe(
      filter((message): message is RpcChannelRequestMessage<Req> => message.type == 'request'),
      map((message) => message)
    ));
  }

  async request<U extends Res>(data: Req, transfer?: any[]): Promise<U> {
    const id = crypto.randomUUID();

    const $response = getResponsePromise(this.channelMessages$, id);
    await this.postMessage({ type: 'request', id, data } satisfies RpcChannelRequestMessage<Req>, transfer);
    const response = await $response;

    return response as U;
  }

  async respond(id: string, data: Res, transfer?: any[]): Promise<void> {
    await this.postMessage({ type: 'response', id, data } satisfies RpcChannelResponseMessage<Res>, transfer);
  }

  async send(data: Data, transfer?: any[]): Promise<void> {
    await this.postMessage({ type: 'data', data } satisfies RpcChannelDataMessage<Data>, transfer);
  }

  abstract close(): void;

  protected abstract postMessage(message: RpcChannelMessage<Data, Req, Res>, transfer?: any[]): void | Promise<void>;
}

async function getResponsePromise<Data, Req, Res>(channelMessage$: Observable<RpcChannelMessage<Data, Req, Res>>, requestId: string): Promise<Res> {
  return new Promise<Res>((resolve, reject) => {
    const subscription = channelMessage$.subscribe({
      next(message) {
        if ((message.type == 'response') && (message.id == requestId)) {
          resolve(message.data);
          subscription.unsubscribe();
        }
      },
      complete() {
        reject(new Error('RpcEndpoint was closed while waiting for response.'));
      }
    });
  });
}
