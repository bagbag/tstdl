import { createReadStream } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';

export class TemporaryFile implements AsyncDisposable {
  #path = `${tmpdir()}/${crypto.randomUUID()}`;

  get path(): string {
    return this.#path;
  }

  static create(): TemporaryFile {
    return new TemporaryFile();
  }

  /**
   * Use an existing file as a temporary file which gets deleted on disposal.
   * @param path path to adopt
   */
  static adopt(path: string): TemporaryFile {
    const file = new TemporaryFile();
    file.#path = path;

    return file;
  }

  static async from(content: string | Uint8Array | ReadableStream<Uint8Array>): Promise<TemporaryFile> {
    const file = new TemporaryFile();
    await file.write(content);

    return file;
  }

  async read(): Promise<Uint8Array> {
    return readFile(this.#path);
  }

  async readText(): Promise<string> {
    return readFile(this.#path, { encoding: 'utf8' });
  }

  readStream(): ReadableStream<Uint8Array> {
    const stream = createReadStream(this.#path);
    return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
  }

  async write(content: string | Uint8Array | ReadableStream<Uint8Array>): Promise<void> {
    await writeFile(this.#path, content as string | Uint8Array | AsyncIterable<Uint8Array>);
  }

  async delete(): Promise<void> {
    await unlink(this.#path);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    try {
      await this.delete();
    }
    catch { }
  }
}
