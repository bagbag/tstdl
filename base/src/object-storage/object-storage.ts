import type { Object, ObjectInformation } from './object';

export interface ObjectStorage<O extends Object<OI>, OI extends ObjectInformation> {
  /**
   * object storage module
   */
  readonly module: string;

  /**
   * checks if an object exists
   * @param key object key
   * @returns wether object exists or not
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
   * @returns url
   */
  getUploadUrl(key: string, expirationTimestamp: number): Promise<string>;

  /**
   * gets all objects
   * @return array of all objects
   */
  getObjects(): Promise<OI[]>;

  /**
   * gets object
   * @param key object key
   * @returns object
   */
  getObject(key: string): Promise<O>;

  /**
   * gets object information
   * @param key object key
   * @returns object information
   */
  getObjectInformation(key: string): Promise<OI>;

  /**
   * gets an url which can be used to download the object without further authorization
   * @param key object key
   * @param expirationTimestamp timestamp when the url expires and can no longer be used
   * @returns url
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
