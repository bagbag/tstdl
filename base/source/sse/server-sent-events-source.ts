import { signal } from '#/signals/api.js';
import { isDefined } from '#/utils/type-guards.js';
import type { ServerSentJsonEvent, ServerSentTextEvent } from './model.js';

export class ServerSentEventsSource {
  readonly #writable: WritableStream<string>;
  readonly #writer: WritableStreamDefaultWriter<string>;
  readonly #closed = signal(false);
  readonly #error = signal<Error | undefined>(undefined);

  readonly readable: ReadableStream<string>;

  readonly closed = this.#closed.asReadonly();
  readonly error = this.#error.asReadonly();

  constructor() {
    const { writable, readable } = new TransformStream<string, string>();

    this.#writable = writable;
    this.readable = readable;

    this.#writer = this.#writable.getWriter();

    this.#writer.closed
      .then(() => (this.#closed.set(true)))
      .catch((error) => {
        this.#error.set(error as Error);
        this.#closed.set(true);
      });
  }

  async close(): Promise<void> {
    await this.#writer.close();
  }

  async sendComment(comment: string): Promise<void> {
    const text = formatText(comment, '');
    await this.#writer.write(text);
  }

  async sendText({ name, data, id, retry }: ServerSentTextEvent): Promise<void> {
    let message = '';

    if (isDefined(name)) {
      message += formatText(name, 'event');
    }

    if (isDefined(data)) {
      message += formatText(data, 'data');
    }

    if (isDefined(id)) {
      message += formatText(id, 'id');
    }

    if (isDefined(retry)) {
      message += formatText(retry.toString(), 'retry');
    }

    message += '\n';

    await this.#writer.write(message);
  }

  async sendJson({ name, data, id, retry }: ServerSentJsonEvent): Promise<void> {
    await this.sendText({
      name,
      data: JSON.stringify(data),
      id,
      retry,
    });
  }
}

function formatText(text: string, type: string): string {
  const formatted = text.split('\n').map((line) => `${type}: ${line}`).join('\n');
  return `${formatted}\n`;
}
