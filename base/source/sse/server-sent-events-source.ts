import { isDefined } from '#/utils/type-guards.js';
import type { ServerSentJsonEvent, ServerSentTextEvent } from './model.js';

export class ServerSentEventsSource {
  private readonly writable: WritableStream<string>;
  private readonly writer: WritableStreamDefaultWriter<string>;

  private _closed: boolean;
  private _error: Error | undefined;

  readonly readable: ReadableStream<string>;

  get closed(): boolean {
    return this._closed;
  }

  get error(): Error | undefined {
    return this._error;
  }

  constructor() {
    const { writable, readable } = new TransformStream<string, string>();

    this.writable = writable;
    this.readable = readable;

    this._closed = false;
    this._error = undefined;
    this.writer = this.writable.getWriter();

    this.writer.closed
      .then(() => (this._closed = true))
      .catch((error) => (this._error = error as Error));
  }

  async close(): Promise<void> {
    await this.writer.close();
  }

  async sendComment(comment: string): Promise<void> {
    const text = formatText(comment, '');
    await this.writer.write(text);
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

    await this.writer.write(message);
  }

  async sendJson({ name, data, id, retry }: ServerSentJsonEvent): Promise<void> {
    return this.sendText({
      name,
      data: JSON.stringify(data),
      id,
      retry
    });
  }
}

function formatText(text: string, type: string): string {
  const formatted = text.split('\n').map((line) => `${type}: ${line}`).join('\n');
  return `${formatted}\n`;
}
