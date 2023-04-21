import { singleton } from '#/container/index.js';
import type { UploadObjectOptions } from '#/object-storage/index.js';
import { ObjectStorage } from '#/object-storage/index.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { now } from '#/utils/date-time.js';
import { readableStreamFromPromise } from '#/utils/stream/index.js';
import { readBinaryStream } from '#/utils/stream/stream-reader.js';
import { assertStringPass, isObject } from '#/utils/type-guards.js';
import type { BucketItem, BucketItemStat } from 'minio';
import { Client } from 'minio';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { S3ObjectStorageProvider } from './s3.object-storage-provider.js';
import { S3Object } from './s3.object.js';

@singleton({
  provider: {
    useFactory: async (argument, context) => context.resolve(S3ObjectStorageProvider).get(assertStringPass(argument, 'resolve argument must be a string (object storage module)'))
  }
})
export class S3ObjectStorage extends ObjectStorage {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(client: Client, bucket: string, module: string, keyPrefix: string) {
    super(module);

    this.client = client;
    this.bucket = bucket;
    this.prefix = keyPrefix;
  }

  async ensureBucketExists(region?: string, options?: { objectLocking?: boolean }): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);

    if (exists) {
      return;
    }

    await this.client.makeBucket(this.bucket, region, { ObjectLocking: options?.objectLocking ?? false });
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

  async statObject(key: string): Promise<BucketItemStat> {
    const bucketKey = this.getBucketKey(key);
    return this.client.statObject(this.bucket, bucketKey);
  }

  async uploadObject(key: string, content: Uint8Array, options?: UploadObjectOptions): Promise<void> {
    const bucketKey = this.getBucketKey(key);
    await this.client.putObject(this.bucket, bucketKey, Buffer.from(content), options?.metadata);
  }

  async uploadObjectStream(key: string, stream: ReadableStream<Uint8Array>, options?: UploadObjectOptions): Promise<void> {
    const bucketKey = this.getBucketKey(key);
    const readable = Readable.fromWeb(stream as NodeReadableStream);
    const errorPromise = new Promise((_, reject) => readable.on('error', reject));

    await Promise.race([
      this.client.putObject(this.bucket, bucketKey, readable, options?.metadata),
      errorPromise
    ]);
  }

  async getContent(key: string): Promise<Uint8Array> {
    const bucketKey = this.getBucketKey(key);
    const result = await this.client.getObject(this.bucket, bucketKey);
    return readBinaryStream(result);
  }

  getContentStream(key: string): ReadableStream<Uint8Array> {
    const bucketKey = this.getBucketKey(key);

    return readableStreamFromPromise(async () => {
      const readable = await this.client.getObject(this.bucket, bucketKey);
      return Readable.toWeb(readable) as ReadableStream<Uint8Array>;
    });
  }

  async getObjects(): Promise<S3Object[]> {
    return toArrayAsync(this.getObjectsCursor());
  }

  getObjectsCursor(): AsyncIterable<S3Object> {
    const stream = this.client.listObjectsV2(this.bucket, this.prefix, true);
    return mapAsync(stream, (item: BucketItem) => new S3Object(this.module, this.getKey(item.name), `s3://${this.bucket}/${item.name}`, item.size, this))
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getObject(key: string): Promise<S3Object> {
    const resourceUri = this.getResourceUriSync(key);
    return new S3Object(this.module, key, resourceUri, undefined, this);
  }

  async getResourceUri(key: string): Promise<string> { // eslint-disable-line @typescript-eslint/require-await
    return this.getResourceUriSync(key);
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

  private getResourceUriSync(key: string): string {
    const bucketKey = this.getBucketKey(key);
    return `s3://${this.bucket}/${bucketKey}`;
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
