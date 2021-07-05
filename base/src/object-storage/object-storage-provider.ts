import type { Object, ObjectInformation } from './object';
import type { ObjectStorage } from './object-storage';

export interface ObjectStorageProvider<T extends ObjectStorage<Object, ObjectInformation>> {
  get(module: string): T;
}
