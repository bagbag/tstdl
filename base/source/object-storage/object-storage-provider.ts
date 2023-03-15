import type { ObjectStorage } from './object-storage.js';

export abstract class ObjectStorageProvider<T extends ObjectStorage = ObjectStorage> {
  /**
   * get an object storage instance
   * @param module name for object container (module) to store objects in. Can be used to isolate objects like profile pictures and log files
   */
  abstract get(module: string): T | Promise<T>;
}
