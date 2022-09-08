import type { RpcEndpointSource } from '#/rpc';
import { Rpc } from '#/rpc';

export type ThreadWorker = (...args: any[]) => any | Promise<any>;

export function exposeThreadWorker<T extends ThreadWorker>(worker: T, endpointOrSource: RpcEndpointSource, name: string = 'default'): void {
  Rpc.expose(worker, endpointOrSource, `thread-worker:${name}`);
}
