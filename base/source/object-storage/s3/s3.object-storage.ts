import { singleton } from '#/container';
import { AsyncEnumerable } from '#/enumerable';
import type { ObjectInformation } from '#/object-storage';
import { ObjectStorage } from '#/object-storage';
import { now } from '#/utils/date-time';
import type { NonObjectBufferMode } from '#/utils/stream-helper-types';
import { readStream } from '#/utils/stream-reader';
import { assertStringPass, isObject } from '#/utils/type-guards';
import type { BucketItem } from 'minio';
import { Client } from 'minio';
import type { TypedReadable } from '../../utils/typed-readable';
import type { S3Object, S3ObjectInformation } from './s3.object';
import { S3ObjectStorageProvider } from './s3.object-storage-provider';

@singleton({
  provider: {
    useFactory: (argument, container) => container.resolve(S3ObjectStorageProvider).get(assertStringPass(argument, 'resolve argument must be a string (object storage module)'))
  }
})
export class S3ObjectStorage extends ObjectStorage<S3ObjectInformation, S3Object> {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(client: Client, bucket: string, module: string, keyPrefix: string) {
    super(module);

    this.client = client;
    this.bucket = bucket;
    this.prefix = keyPrefix;
  }

  async ensureBucketExists(region: string): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);

    if (exists) {
      return;
    }

    await this.client.makeBucket(this.bucket, region);
  }

  async exists(key: string): Promise<boolean> {
    const bucketKey = this.getBucketKey(key);

    try {
      await this.client.statObject(this.bucket, bucketKey);
      return true;
    }
    catch (error: unknown) {
      if (isObject(error) && (error as { code: string }).code == 'NotFound') {
        return false;
      }

      throw error;
    }
  }

  async uploadObject(key: string, content: ArrayBuffer): Promise<void> {
    const bucketKey = this.getBucketKey(key);
    const buffer = Buffer.from(content);

    await this.client.putObject(this.bucket, bucketKey, buffer);
  }

  async getObjects(): Promise<S3ObjectInformation[]> {
    const stream = this.client.listObjectsV2(this.bucket, this.prefix, true);
    const bucketItems = await AsyncEnumerable.from<BucketItem>(stream).toArray();
    const objectInformations = bucketItems.map((item): S3ObjectInformation => ({
      module: this.module,
      key: this.getKey(item.name),
      resourceUri: `s3://${this.bucket}/${item.name}`,
      contentLength: item.size
    }));

    return objectInformations;
  }

  async getObject(key: string): Promise<S3Object> {
    const bucketKey = this.getBucketKey(key);
    const stat = await this.client.statObject(this.bucket, bucketKey);
    const result = await this.client.getObject(this.bucket, bucketKey);
    const content = await readStream(result as TypedReadable<NonObjectBufferMode>);

    const object: S3Object = {
      module: this.module,
      key,
      resourceUri: `s3://${this.bucket}/${bucketKey}`,
      contentLength: stat.size,
      content
    };

    return object;
  }

  async getObjectInformation(key: string): Promise<ObjectInformation> {
    const bucketKey = this.getBucketKey(key);
    const stat = await this.client.statObject(this.bucket, bucketKey);

    const information: S3ObjectInformation = {
      module: this.module,
      key,
      resourceUri: `s3://${this.bucket}/${bucketKey}`,
      contentLength: stat.size
    };

    return information;
  }

  async getResourceUri(key: string): Promise<string> { // eslint-disable-line @typescript-eslint/require-await
    const bucketKey = this.getBucketKey(key);
    return `s3://${this.bucket}/${bucketKey}`;
  }

  async getDownloadUrl(key: string, expirationTimestamp: number): Promise<string> {
    const bucketKey = this.getBucketKey(key);
    const { date, expiration } = getDateAndExpiration(expirationTimestamp);

    return this.client.presignedGetObject(this.bucket, bucketKey, expiration, {}, date);
  }

  async getUploadUrl(key: string, expirationTimestamp: number): Promise<string> {
    const bucketKey = this.getBucketKey(key);
    const { date, expiration } = getDateAndExpiration(expirationTimestamp);

    return this.client.presignedUrl('PUT', this.bucket, bucketKey, expiration, {}, date);
  }

  async deleteObject(key: string): Promise<void> {
    const bucketKey = this.getBucketKey(key);
    await this.client.removeObject(this.bucket, bucketKey);
  }

  async deleteObjects(keys: string[]): Promise<void> {
    const bucketKeys = keys.map((key) => this.getBucketKey(key));
    await this.client.removeObjects(this.bucket, bucketKeys);
  }

  private getBucketKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private getKey(bucketKey: string): string {
    return bucketKey.slice(this.prefix.length);
  }
}

function getDateAndExpiration(expirationTimestamp: number): { date: Date, expiration: number } {
  const date = now();
  const diffSeconds = Math.floor((expirationTimestamp - date.getTime()) / 1000);

  return { date, expiration: diffSeconds };
}
