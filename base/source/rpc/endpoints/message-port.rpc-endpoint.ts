import type * as NodeWorkerThreads from 'node:worker_threads';

import type { Observable } from 'rxjs';
import { Subject, fromEvent, map, takeUntil } from 'rxjs';

import { isBrowser } from '#/environment.js';
import type { RpcMessage } from '../model.js';
import { RpcEndpoint } from '../rpc-endpoint.js';

type BrowserSource = Worker | MessagePort | Window | SharedWorker;
type NodeSource = NodeWorkerThreads.MessagePort | NodeWorkerThreads.Worker;

export type MessagePortRpcEndpointSource = BrowserSource | NodeSource;

export class MessagePortRpcEndpoint extends RpcEndpoint {
  readonly #closeSubject = new Subject<void>();

  private readonly source: MessagePortRpcEndpointSource;
  private readonly _postMessage: this['postMessage'];

  readonly supportsTransfers: boolean = true;
  readonly message$: Observable<RpcMessage>;

  constructor(source: MessagePortRpcEndpointSource) {
    super();

    this.source = (isBrowser && ((typeof SharedWorker == 'function') && (source instanceof SharedWorker)))
      ? source.port
      : source;

    this.message$ = fromEvent((this.source as MessagePort), 'message').pipe(
      takeUntil(this.#closeSubject),
      map((message: unknown): RpcMessage => ((message instanceof MessageEvent) ? { ...(message.data as RpcMessage), metadata: { source: message } } : message as RpcMessage))
    );

    this._postMessage = isBrowser
      ? (data, transfer) => (this.source as MessagePort).postMessage(data, { transfer })
      : (data, transfer) => (this.source as NodeSource).postMessage(data, transfer);
  }

  start(): void {
    if (this.source instanceof MessagePort) {
      this.source.start();
    }
  }

  close(): void {
    if (this.source instanceof MessagePort) {
      this.source.close();
    }

    this.#closeSubject.next();
  }

  postMessage(data: any, transfer?: any[] | undefined): void {
    this._postMessage(data, transfer);
  }
}
