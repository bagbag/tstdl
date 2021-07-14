import type { ObjectInformation, ObjectStorageObject } from './object';
import type { ObjectStorage } from './object-storage';

export interface ObjectStorageProvider<T extends ObjectStorage<ObjectStorageObject, ObjectInformation>> {
  get(module: string): T;
}
