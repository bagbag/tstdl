import type { Injectable } from '#/container';
import { injectArgumentType } from '#/container';
import type { ObjectInformation, ObjectStorageObject } from './object';

export type ObjectStorageArgument = string;

export abstract class ObjectStorage<OI extends ObjectInformation = ObjectInformation, O extends ObjectStorageObject<OI> = ObjectStorageObject<OI>> implements Injectable<ObjectStorageArgument> {
  /**
   * object storage module
   */
  readonly module: string;

  [injectArgumentType]: ObjectStorageArgument;

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
  abstract uploadObject(key: string, content: ArrayBuffer): Promise<void>;

  /**
   * gets an url which can be used to upload the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   */
  abstract getUploadUrl(key: string, expirationTimestamp: number): Promise<string>;

  /**
   * gets all objects
   */
  abstract getObjects(): Promise<OI[]>;

  /**
   * gets object
   * @param key object key
   */
  abstract getObject(key: string): Promise<O>;

  /**
   * gets object information
   * @param key object key
   */
  abstract getObjectInformation(key: string): Promise<OI>;

  /**
   * gets object resource uri
   * @param key object key
   */
  abstract getResourceUri(key: string): Promise<string>;

  /**
   * gets an url which can be used to download the object without further authorization
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
