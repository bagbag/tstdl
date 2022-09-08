import type { Observable } from 'rxjs';
import { fromEvent, map } from 'rxjs';
import type { RpcMessage } from '../model';
import { RpcEndpoint } from '../rpc-endpoint';

export interface BrowserMessagePortRpcEndpointSource {
  addEventListener(type: 'message', listener: (event: MessageEvent) => any): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => any): void;
  postMessage(value: any, transfer?: readonly any[]): void;
}

export interface NodeMessagePortRpcEndpointSource {
  addListener(event: 'message', listener: (value: any) => void): this;
  removeListener(event: 'message', listener: (value: any) => void): this;
  postMessage(value: any, transfer?: readonly any[]): void;
}

export type MessagePortRpcEndpointSource = BrowserMessagePortRpcEndpointSource | NodeMessagePortRpcEndpointSource;

export class MessagePortRpcEndpoint extends RpcEndpoint {
  private readonly messagePort: MessagePortRpcEndpointSource;

  readonly supportsTransfers: boolean = true;
  readonly message$: Observable<RpcMessage>;

  constructor(messagePort: MessagePortRpcEndpointSource) {
    super();

    this.messagePort = messagePort;

    this.message$ = fromEvent((messagePort as BrowserMessagePortRpcEndpointSource), 'message').pipe(
      map((message): RpcMessage => ((message instanceof MessageEvent) ? { ...(message.data as RpcMessage), metadata: { source: message } } : message))
    );
  }

  postMessage(data: any, transfer?: any[] | undefined): void {
    this.messagePort.postMessage(data, transfer);
  }
}
