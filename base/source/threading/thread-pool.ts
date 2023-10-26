import type * as NodeWorkerThreads from 'node:worker_threads'; // eslint-disable-line import/no-nodejs-modules
import type { LiteralUnion } from 'type-fest';

import type { AsyncDisposable } from '#/disposable/index.js';
import { disposeAsync } from '#/disposable/index.js';
import { isNode } from '#/environment.js';
import { dynamicImport } from '#/import.js';
import type { Logger } from '#/logger/index.js';
import { Pool } from '#/pool/index.js';
import { MessagePortRpcEndpoint } from '#/rpc/endpoints/message-port.rpc-endpoint.js';
import type { RpcRemote } from '#/rpc/index.js';
import { Rpc } from '#/rpc/index.js';
import type { ThreadWorker } from './thread-worker.js';

type ThreadPoolWorker = Worker | NodeWorkerThreads.Worker;

type PoolEntry = {
  worker: ThreadPoolWorker,
  remotes: Map<string, RpcRemote<ThreadWorker>>
};

export type ThreadOptions = (WorkerOptions | NodeWorkerThreads.WorkerOptions) & {
  threadCount?: number
};

let spawnWorker: (url: string | URL, options: any) => ThreadPoolWorker | Promise<ThreadPoolWorker>;

if (isNode) {
  spawnWorker = async (url, options) => {
    const workerThreads = await dynamicImport<typeof NodeWorkerThreads>('node:worker_threads');

    spawnWorker = () => new workerThreads.Worker(url, options as NodeWorkerThreads.WorkerOptions);
    return spawnWorker(url, options);
  };
}
else {
  spawnWorker = (url, options) => new Worker(url, options as WorkerOptions);
}

export class ThreadPool implements AsyncDisposable {
  private readonly pool: Pool<PoolEntry>;

  readonly url: string | URL;
  readonly options: ThreadOptions | undefined;

  constructor(url: string | URL, logger: Logger, options?: ThreadOptions) {
    this.url = url;
    this.options = options;

    this.pool = new Pool(async () => this.spawn(), async ({ worker }) => worker.terminate(), logger, { size: options?.threadCount });
  }

  async dispose(): Promise<void> {
    return this[disposeAsync]();
  }

  async [disposeAsync](): Promise<void> {
    await this.pool.dispose();
  }

  getProcessor<T extends ThreadWorker>(name: string = 'default'): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    const processor = async (...args: Parameters<T>): Promise<ReturnType<T>> => this.process(name, ...args);
    return processor;
  }

  async process<T extends ThreadWorker>(name: LiteralUnion<'default', string>, ...args: Parameters<T>): Promise<ReturnType<T>> {
    return this.pool.use(async (entry) => {
      if (!entry.remotes.has(name)) {
        const rpcEndpoint = MessagePortRpcEndpoint.from(entry.worker);
        const remote = await Rpc.connect<T>(rpcEndpoint, `thread-worker:${name}`);
        entry.remotes.set(name, remote);
      }

      return entry.remotes.get(name)!(...args) as Promise<ReturnType<T>>;
    });
  }

  private async spawn(): Promise<PoolEntry> {
    const worker = await spawnWorker(this.url, this.options);
    const remotes = new Map();

    return { worker, remotes };
  }
}
