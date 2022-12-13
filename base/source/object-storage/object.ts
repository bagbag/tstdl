import type { Record } from '#/types';

export type ObjectMetadata = Record<string>;

export abstract class ObjectStorageObject {
  readonly module: string;
  readonly key: string;

  constructor(module: string, key: string) {
    this.module = module;
    this.key = key;
  }

  abstract getResourceUri(): Promise<string>;

  abstract getContentLength(): Promise<number>;

  abstract getMetadata(): Promise<ObjectMetadata>;

  abstract getContent(): Promise<Uint8Array>;

  abstract getContentStream(): ReadableStream<Uint8Array>;
}
