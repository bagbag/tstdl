import type * as NodeWorkerThreads from 'node:worker_threads';

import type { Observable } from 'rxjs';
import { ReplaySubject, Subject, filter, fromEvent, map, shareReplay, startWith, switchMap, takeUntil } from 'rxjs';

import { isBrowser } from '#/environment.js';
import { deferThrow } from '#/utils/throw.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import type { RpcChannelMessage } from '../rpc.endpoint.js';
import { RpcChannel, RpcEndpoint } from '../rpc.endpoint.js';

type BrowserTransport = Worker | MessagePort | Window | SharedWorker;
type NodeTransport = NodeWorkerThreads.MessagePort | NodeWorkerThreads.Worker;

export type MessagePortRpcTransport = BrowserTransport | NodeTransport;

type MessagePortMessageBase<Type extends string> = { seq: number, type: Type };
type MessagePortOpenChannelMessage = MessagePortMessageBase<'open-channel'> & { id: string, port: MessagePort | NodeWorkerThreads.MessagePort };
type MessagePortCloseChannelMessage = MessagePortMessageBase<'close-channel'>;
type MessagePortDataMessage<T> = MessagePortMessageBase<'data'> & { data: T };

type MessagePortMessage<T> = MessagePortOpenChannelMessage | MessagePortCloseChannelMessage | MessagePortDataMessage<T>;

export class MessagePortRpcChannel<Data = any, Req = any, Res = any> extends RpcChannel<Data, Req, Res> {
  readonly #transportSubject = new ReplaySubject<MessagePortRpcTransport>(1);
  readonly #closeSubject = new Subject<void>();

  private readonly _postMessage: (message: MessagePortMessage<RpcChannelMessage<Data, Req, Res>>, transfer?: any[]) => void;

  private transport: MessagePortRpcTransport | undefined = { postMessage: deferThrow(() => new Error('Rpc transport not yet initialized.')) } satisfies Pick<MessagePort, 'postMessage'> as unknown as MessagePortRpcTransport;
  readonly messagePortMessage$: Observable<MessagePortMessage<RpcChannelMessage<Data, Req, Res>>>;
  override channelMessages$: Observable<RpcChannelMessage<Data, Req, Res>>;

  override readonly supportsTransfers = true;
  override readonly endpoint: MessagePortRpcEndpoint;

  sequence = 1;
  lastSequence = 0;

  constructor(id: string, transport: MessagePortRpcTransport | undefined, endpoint: MessagePortRpcEndpoint) {
    super(id);

    this.endpoint = endpoint;

    if (isDefined(transport)) {
      this.setTransport(transport);
    }

    this.messagePortMessage$ = this.#transportSubject.pipe(
      startWith(transport),
      filter(isDefined),
      switchMap((newTransport) => fromEvent<MessagePortMessage<RpcChannelMessage<Data, Req, Res>> | MessageEvent<MessagePortMessage<RpcChannelMessage<Data, Req, Res>>>>((newTransport as MessagePort), 'message')),
      takeUntil(this.#closeSubject),
      map((message) => ((message instanceof MessageEvent) ? message.data : message)),
      shareReplay({ bufferSize: 0, refCount: true })
    );

    this.channelMessages$ = this.messagePortMessage$.pipe(
      filter((message): message is MessagePortDataMessage<RpcChannelMessage<Data, Req, Res>> => message.type == 'data'),
      map((message) => message.data)
    );

    this._postMessage = isBrowser
      ? (data, transfer) => (this.transport as MessagePort).postMessage(data, { transfer })
      : (data, transfer) => (this.transport as NodeTransport).postMessage(data, transfer);

    if (transport instanceof MessagePort) {
      transport.start();
    }

    this.messagePortMessage$.subscribe((message) => {
      if (message.type == 'close-channel') {
        this.close();
      }
    });
  }

  setTransport(transport: MessagePortRpcTransport): void {
    this.transport = transport;

    this.#transportSubject.next(transport);
    this.#transportSubject.complete();
  }

  postPortMessage(message: MessagePortMessage<RpcChannelMessage<Data, Req, Res>>, transfer?: any[]): void {
    this._postMessage(message, transfer);
  }

  override close(): void {
    this.postPortMessage({ seq: this.sequence++, type: 'close-channel' });

    if (this.transport instanceof MessagePort) {
      this.transport.close();
    }

    this.#closeSubject.next();
    this.endpoint.forgetChannel(this.id);
  }

  override postMessage(message: RpcChannelMessage<Data, Req, Res>, transfer?: any[] | undefined): void | Promise<void> {
    this.postPortMessage({ seq: this.sequence++, type: 'data', data: message }, transfer);
  }
}

export class MessagePortRpcEndpoint extends RpcEndpoint {
  readonly #closeSubject = new Subject<void>();
  readonly #channels = new Map<string, MessagePortRpcChannel>();

  private readonly transport: MessagePortRpcTransport;
  private readonly mainChannel: MessagePortRpcChannel;

  constructor(source: MessagePortRpcTransport) {
    super();

    this.transport = (isBrowser && ((typeof SharedWorker == 'function') && (source instanceof SharedWorker)))
      ? source.port
      : source;

    this.mainChannel = new MessagePortRpcChannel('main', this.transport, this);

    this.mainChannel.messagePortMessage$.subscribe((message) => {
      if (message.type == 'open-channel') {
        this.handleOpenChannelMessage(message);
      }
    });
  }

  static from(transport: MessagePortRpcTransport): MessagePortRpcEndpoint {
    return new MessagePortRpcEndpoint(transport);
  }

  override openChannel<Data, Req, Res>(id: string = crypto.randomUUID()): MessagePortRpcChannel<Data, Req, Res> {
    const { port1, port2 } = new MessageChannel();

    const openChannelMessage: MessagePortOpenChannelMessage = { seq: this.mainChannel.sequence++, type: 'open-channel', id, port: port2 };

    this.mainChannel.postPortMessage(openChannelMessage, [port2]);

    const channel = new MessagePortRpcChannel<Data, Req, Res>(id, port1, this);
    this.#channels.set(id, channel);

    return channel;
  }

  override getChannel<Data, Req, Res>(id: string): MessagePortRpcChannel<Data, Req, Res> {
    const channel = this.#channels.get(id);

    if (isUndefined(channel)) {
      const newChannel = new MessagePortRpcChannel<Data, Req, Res>(id, undefined, this);
      this.#channels.set(id, newChannel);

      return newChannel;
    }

    return channel as MessagePortRpcChannel<Data, Req, Res>;
  }

  override getOrOpenChannel<Data, Req, Res>(id: string): RpcChannel<Data, Req, Res> {
    return this.#channels.get(id) ?? this.openChannel(id);
  }

  close(): void {
    if (this.transport instanceof MessagePort) {
      this.transport.close();
    }

    this.#closeSubject.next();
  }

  forgetChannel(id: string): void {
    this.#channels.delete(id);
  }

  private handleOpenChannelMessage(message: MessagePortOpenChannelMessage): void {
    const { id, port } = message;

    if (this.#channels.has(id)) {
      this.#channels.get(id)!.setTransport(port);
      return;
    }

    const channel = new MessagePortRpcChannel(id, port, this);
    this.#channels.set(id, channel);
  }
}
