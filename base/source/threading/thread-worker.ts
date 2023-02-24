import type { RpcEndpointSource } from '#/rpc/index.js';
import { Rpc } from '#/rpc/index.js';

export type ThreadWorker = (...args: any[]) => any | Promise<any>;

export function exposeThreadWorker<T extends ThreadWorker>(worker: T, endpointOrSource: RpcEndpointSource, name: string = 'default'): void {
  Rpc.expose(worker, endpointOrSource, `thread-worker:${name}`);
}
