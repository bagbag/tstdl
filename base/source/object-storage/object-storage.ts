import type { Injectable } from '#/container';
import { resolveArgumentType } from '#/container';
import type { ObjectMetadata, ObjectStorageObject } from './object';

export type UploadObjectOptions = {
  metadata?: ObjectMetadata
};

export type ObjectStorageArgument = string;

export abstract class ObjectStorage implements Injectable<ObjectStorageArgument> {
  /**
   * object storage module
   */
  readonly module: string;

  [resolveArgumentType]: ObjectStorageArgument;

  constructor(module: string) {
    this.module = module;
  }

  /**
   * checks if an object exists
   * @param key object key
   */
  abstract exists(key: string): Promise<boolean>;

  /**
   * uploads an object
   * @param key object key
   * @param content content of object
   */
  abstract uploadObject(key: string, content: Uint8Array, options?: UploadObjectOptions): Promise<void>;

  /**
   * get an url which can be used to upload the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   */
  abstract getUploadUrl(key: string, expirationTimestamp: number): Promise<string>;

  /**
   * get all objects
   */
  abstract getObjects(): Promise<ObjectStorageObject[]>;

  /**
   * get all objects
   */
  abstract getObjectsCursor(): AsyncIterable<ObjectStorageObject>;

  /**
   * get object
   * @param key object key
   */
  abstract getObject(key: string): Promise<ObjectStorageObject>;

  /**
   * get object resource uri
   * @param key object key
   */
  abstract getResourceUri(key: string): Promise<string>;

  /**
   * get stream of object content
   * @param key object key
   */
  abstract getContentStream(key: string): ReadableStream<Uint8Array>;

  /**
   * get an url which can be used to download the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   */
  abstract getDownloadUrl(key: string, expirationTimestamp: number): Promise<string>;

  /**
   * deletes an object
   * @param key object key
   */
  abstract deleteObject(key: string): Promise<void>;

  /**
   * deletes objects
   * @param keys object key
   */
  abstract deleteObjects(keys: string[]): Promise<void>;
}
