import { Rpc } from '#/rpc/index.js';

export type ThreadWorker = (...args: any[]) => any | Promise<any>;

export function exposeThreadWorker<T extends ThreadWorker>(worker: T, name: string = 'default'): void {
  Rpc.expose(worker, `thread-worker:${name}`);
}
