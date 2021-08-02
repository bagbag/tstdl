import type { ObjectStorage } from './object-storage';

export interface ObjectStorageProvider<T extends ObjectStorage> {
  /**
   * get an object storage instance
   * @param module name for object container (module) to store objects in. Can be used to isolate objects like profile pictures and log files
   */
  get(module: string): T;
}
