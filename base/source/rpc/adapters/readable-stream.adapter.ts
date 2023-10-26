import { NotSupportedError } from '#/errors/not-supported.error.js';
import { Timer } from '#/utils/timer.js';
import type { AdaptSourceResult, RpcAdapter } from '../rpc.adapter.js';
import type { RpcChannel } from '../rpc.endpoint.js';

type Request =
  | { type: 'pull' }
  | { type: 'cancel', reason?: any };

type Response<T> =
  | { type: 'values', values: T[] }
  | { type: 'done' }
  | { type: 'void' };

export class ReadableStreamRpcAdapter<T> implements RpcAdapter<ReadableStream<T>, void, void, Request, Response<T>> {
  readonly name = 'ReadableStream';
  readonly maxChunkSize: number;

  constructor(maxChunkSize = 1000) {
    this.maxChunkSize = maxChunkSize;
  }

  adaptSource(stream: ReadableStream<T>, channel: RpcChannel<void, Request, Response<T>>): AdaptSourceResult<void> {
    const reader = stream.getReader();

    channel.request$.subscribe(async ({ id, data }) => { // eslint-disable-line @typescript-eslint/no-misused-promises
      switch (data.type) {
        case 'pull': {
          const values: T[] = [];

          const timer = Timer.startNew();
          while ((timer.milliseconds < 3) && (values.length < this.maxChunkSize)) {
            const result = await reader.read();

            if (result.done) {
              break;
            }

            values.push(result.value);
          }

          const response: Response<T> = (values.length > 0)
            ? { type: 'values', values }
            : { type: 'done' };

          await channel.respond(id, response);

          break;
        }

        case 'cancel': {
          await reader.cancel(data.reason);
          await channel.respond(id, { type: 'void' });
          channel.close();

          break;
        }

        default:
          throw new NotSupportedError(`Type ${(data as Request).type} is not supported.`);
      }
    });
  }

  adaptTarget(_data: void, channel: RpcChannel<void, Request, Response<T>>): ReadableStream<T> {
    return new ReadableStream<T>({
      async pull(controller) {
        const response = await channel.request({ type: 'pull' });

        switch (response.type) {
          case 'values': {
            for (const value of response.values) {
              controller.enqueue(value);
            }

            break;
          }

          case 'done': {
            controller.close();
            break;
          }

          default: {
            throw new NotSupportedError(`Type ${(response as Response<T>).type} is not supported.`);
          }
        }
      },
      async cancel(reason) {
        await channel.request({ type: 'cancel', reason });
        channel.close();
      }
    });
  }
}

export const defaultReadableStreamRpcAdapter = new ReadableStreamRpcAdapter();
