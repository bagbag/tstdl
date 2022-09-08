import type { AsyncDisposable } from '#/disposable';
import { disposeAsync } from '#/disposable';
import { isNode } from '#/environment';
import { Pool } from '#/pool';
import { dynamicRequire } from '#/require';
import type { RpcRemote } from '#/rpc';
import { Rpc } from '#/rpc';
import type * as NodeWorkerThreads from 'worker_threads';
import type { ThreadWorker } from './thread-worker';

type ThreadPoolWorker = Worker | NodeWorkerThreads.Worker;

type PoolEntry = {
  worker: ThreadPoolWorker,
  remotes: Map<string, RpcRemote<ThreadWorker>>
};

export type ThreadOptions = (WorkerOptions | NodeWorkerThreads.WorkerOptions) & {
  threadCount?: number
};

let spawnWorker: (url: string | URL, options: any) => ThreadPoolWorker;

if (isNode) {
  const { Worker: NodeWorker } = dynamicRequire<typeof NodeWorkerThreads>('worker_threads');
  spawnWorker = (url, options) => new NodeWorker(url, options as NodeWorkerThreads.WorkerOptions);
}
else {
  spawnWorker = (url, options) => new Worker(url, options as WorkerOptions);
}

export class ThreadPool implements AsyncDisposable {
  private readonly pool: Pool<PoolEntry>;

  readonly url: string | URL;
  readonly options: ThreadOptions | undefined;

  constructor(url: string | URL, options?: ThreadOptions) {
    this.url = url;
    this.options = options;

    this.pool = new Pool(() => this.spawn(), ({ worker }) => worker.terminate(), { size: options?.threadCount, disposeOnError: false });
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

  async process<T extends ThreadWorker>(name: string, ...args: Parameters<T>): Promise<ReturnType<T>> {
    return this.pool.use(async (entry) => {
      const hasRemote = entry.remotes.has(name);

      const remote = hasRemote ? entry.remotes.get(name)! : await Rpc.connect<T>(entry.worker, `thread-worker:${name}`);

      if (!hasRemote) {
        entry.remotes.set(name, remote);
      }

      return remote(...args) as Promise<ReturnType<T>>;
    });
  }

  private spawn(): PoolEntry {
    const worker = spawnWorker(this.url, this.options);
    const remotes = new Map();

    return { worker, remotes };
  }
}
