import type { ObjectInformation, ObjectStorageObject } from './object';

export interface ObjectStorage<OI extends ObjectInformation = ObjectInformation, O extends ObjectStorageObject<OI> = ObjectStorageObject<OI>> {
  /**
   * object storage module
   */
  readonly module: string;

  /**
   * checks if an object exists
   * @param key object key
   */
  exists(key: string): Promise<boolean>;

  /**
   * uploads an object
   * @param key object key
   * @param content content of object
   */
  uploadObject(key: string, content: ArrayBuffer): Promise<void>;

  /**
   * gets an url which can be used to upload the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   */
  getUploadUrl(key: string, expirationTimestamp: number): Promise<string>;

  /**
   * gets all objects
   */
  getObjects(): Promise<OI[]>;

  /**
   * gets object
   * @param key object key
   */
  getObject(key: string): Promise<O>;

  /**
   * gets object information
   * @param key object key
   */
  getObjectInformation(key: string): Promise<OI>;

  /**
   * gets object resource uri
   * @param key object key
   */
  getResourceUri(key: string): Promise<string>;

  /**
   * gets an url which can be used to download the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   */
  getDownloadUrl(key: string, expirationTimestamp: number): Promise<string>;

  /**
   * deletes an object
   * @param key object key
   */
  deleteObject(key: string): Promise<void>;

  /**
   * deletes objects
   * @param keys object key
   */
  deleteObjects(keys: string[]): Promise<void>;
}
