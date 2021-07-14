import type { ObjectInformation, ObjectStorageObject } from '#/object-storage';

export type S3ObjectInformation = ObjectInformation;

export type S3Object = ObjectStorageObject<S3ObjectInformation>;
