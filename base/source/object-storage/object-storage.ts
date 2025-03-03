import { resolveArgumentType, type Resolvable } from '#/injector/interfaces.js';
import type { ObjectMetadata, ObjectStorageObject } from './object.js';

export type UploadObjectOptions = {
  contentLength?: number,
  metadata?: ObjectMetadata
};

export type ObjectStorageArgument = string;

export abstract class ObjectStorage implements Resolvable<ObjectStorageArgument> {
  /** Object storage module */
  readonly module: string;

  declare readonly [resolveArgumentType]: ObjectStorageArgument;
  constructor(module: string) {
    this.module = module;
  }

  /**
   * Checks if an object exists
   * @param key object key
   */
  abstract exists(key: string): Promise<boolean>;

  /**
   * Uploads an object
   * @param key object key
   * @param content content of object
   */
  abstract uploadObject(key: string, content: Uint8Array | ReadableStream<Uint8Array>, options?: UploadObjectOptions): Promise<void>;

  /**
   * Get an url which can be used to upload the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   */
  abstract getUploadUrl(key: string, expirationTimestamp: number): Promise<string>;

  /**
   * Get all objects
   */
  abstract getObjects(): Promise<ObjectStorageObject[]>;

  /**
   * Get all objects
   */
  abstract getObjectsCursor(): AsyncIterable<ObjectStorageObject>;

  /**
   * Get object
   * @param key object key
   */
  abstract getObject(key: string): Promise<ObjectStorageObject>;

  /**
   * Get object resource uri
   * @param key object key
   */
  abstract getResourceUri(key: string): Promise<string>;

  /**
   * Get object content
   * @param key object key
   */
  abstract getContent(key: string): Promise<Uint8Array>;

  /**
   * Get stream of object content
   * @param key object key
   */
  abstract getContentStream(key: string): ReadableStream<Uint8Array>;

  /**
   * Get an url which can be used to download the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   * @param responseHeaders headers used for download response
   */
  abstract getDownloadUrl(key: string, expirationTimestamp: number, responseHeaders?: Record<string, string>): Promise<string>;

  /**
   * Deletes an object
   * @param key object key
   */
  abstract deleteObject(key: string): Promise<void>;

  /**
   * Deletes objects
   * @param keys object key
   */
  abstract deleteObjects(keys: string[]): Promise<void>;
}
