import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import { CopyDestinationOptions, CopySourceOptions, type BucketItem, type BucketItemStat, type Client, type LifecycleConfig } from 'minio';

import { Singleton } from '#/injector/decorators.js';
import { registerAfterResolve } from '#/injector/resolution.js';
import { ObjectStorage, type CopyObjectOptions, type MoveObjectOptions, type ObjectStorageConfiguration, type UploadObjectOptions, type UploadUrlOptions } from '#/object-storage/index.js';
import { toArray } from '#/utils/array/array.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { now } from '#/utils/date-time.js';
import { mapObjectKeys } from '#/utils/object/object.js';
import { readableStreamFromPromise } from '#/utils/stream/index.js';
import { readBinaryStream } from '#/utils/stream/stream-reader.js';
import { assertDefinedPass, assertInstanceOfPass, isDefined, isObject, isString, isUint8Array, isUndefined } from '#/utils/type-guards.js';
import { secondsPerDay } from '#/utils/units.js';
import { S3ObjectStorageProvider } from './s3.object-storage-provider.js';
import { S3Object } from './s3.object.js';

@Singleton<S3ObjectStorage>({
  provider: {
    useFactory: (argument, context) => {
      const { module } = (isString(argument) ? { module: argument } : assertDefinedPass(argument, 'argument must be a string or an object'));
      return context.resolve(S3ObjectStorageProvider).get(module);
    },
  },
  argumentIdentityProvider: JSON.stringify,
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

    registerAfterResolve(this, async (argument) => {
      const configuration = (isString(argument) ? undefined : argument.configuration) ?? {};

      await this.ensureBucketExists();
      await this.configureBucket(configuration);
    });
  }

  async ensureBucketExists(region?: string, options?: { objectLocking?: boolean }): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);

    if (exists) {
      return;
    }

    await this.client.makeBucket(this.bucket, region ?? '', { ObjectLocking: options?.objectLocking ?? false });
  }

  async configureBucket(configuration: ObjectStorageConfiguration): Promise<void> {
    let currentLifecycle: LifecycleConfig | null = null;

    try {
      currentLifecycle = await this.client.getBucketLifecycle(this.bucket);
    }
    catch (error: unknown) {
      // ignore error if lifecycle configuration is not set

      if (!isObject(error) || ((error as { code: string }).code != 'NoSuchLifecycleConfiguration')) {
        throw error;
      }
    }

    const currentLifecycleRules = isDefined(currentLifecycle?.Rule) ? toArray(currentLifecycle.Rule) : undefined; // https://github.com/minio/minio-js/issues/1407
    const tstdlRule = currentLifecycleRules?.find((rule) => rule.ID == 'TstdlExpireObjects');

    const tstdlRuleExpiration = tstdlRule?.Expiration?.Days;
    const targetExpirationDays = configuration.lifecycle?.expiration?.after;
    const targetExpiration = isDefined(targetExpirationDays) ? Math.ceil(targetExpirationDays / secondsPerDay) : undefined;

    if (tstdlRuleExpiration == targetExpiration) {
      return;
    }

    const nonTstdlRules = currentLifecycleRules?.filter((rule) => rule.ID != 'TstdlExpireObjects') ?? [];

    if (isUndefined(targetExpiration)) {
      if (nonTstdlRules.length == 0) {
        await this.client.removeBucketLifecycle(this.bucket);
      }
      else {
        await this.client.setBucketLifecycle(this.bucket, { Rule: nonTstdlRules });
      }
    }
    else {
      await this.client.setBucketLifecycle(this.bucket, {
        Rule: [
          ...nonTstdlRules,
          {
            ID: 'TstdlExpireObjects',
            Status: 'Enabled',
            Expiration: {
              Days: targetExpiration,
            },
          },
        ],
      });
    }
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
    return await this.client.statObject(this.bucket, bucketKey);
  }

  async uploadObject(key: string, content: Uint8Array | ReadableStream<Uint8Array>, options?: UploadObjectOptions): Promise<void> {
    const bucketKey = this.getBucketKey(key);

    if (isUint8Array(content)) {
      await this.client.putObject(this.bucket, bucketKey, Buffer.from(content), options?.contentLength, options?.metadata);
    }
    else {
      const readable = Readable.fromWeb(content as NodeReadableStream);
      const errorPromise = new Promise((_, reject) => readable.on('error', reject));

      await Promise.race([
        this.client.putObject(this.bucket, bucketKey, readable, options?.contentLength, options?.metadata),
        errorPromise,
      ]);
    }
  }

  async copyObject(source: string, destination: string | [ObjectStorage, string], options?: CopyObjectOptions): Promise<void> {
    const sourceBucketKey = this.getBucketKey(source);

    const [destinationObjectStorage, destinationKey] = isString(destination) ? [this, destination] : [assertInstanceOfPass(destination[0], S3ObjectStorage, 'Destination storage is not an S3ObjectStorage'), destination[1]];
    const destinationBucket = destinationObjectStorage.bucket;
    const destinationBucketKey = destinationObjectStorage.getBucketKey(destinationKey);

    const sourceObject = await this.getObject(source);
    const sourceMetadata = await sourceObject.getMetadata();

    await this.client.copyObject(
      new CopySourceOptions({ Bucket: this.bucket, Object: sourceBucketKey }),
      new CopyDestinationOptions({
        Bucket: destinationBucket,
        Object: destinationBucketKey,
        MetadataDirective: 'REPLACE',
        UserMetadata: { ...sourceMetadata, ...options?.metadata },
      }),
    );
  }

  async moveObject(sourceKey: string, destinationKey: string | [ObjectStorage, string], options?: MoveObjectOptions): Promise<void> {
    await this.copyObject(sourceKey, destinationKey, options);
    await this.deleteObject(sourceKey);
  }

  async getContent(key: string): Promise<Uint8Array<ArrayBuffer>> {
    const bucketKey = this.getBucketKey(key);
    const result = await this.client.getObject(this.bucket, bucketKey);
    return await readBinaryStream(result);
  }

  getContentStream(key: string): ReadableStream<Uint8Array<ArrayBuffer>> {
    const bucketKey = this.getBucketKey(key);

    return readableStreamFromPromise(async () => {
      const readable = await this.client.getObject(this.bucket, bucketKey);
      return Readable.toWeb(readable) as ReadableStream<Uint8Array<ArrayBuffer>>;
    });
  }

  async getObjects(): Promise<S3Object[]> {
    return await toArrayAsync(this.getObjectsCursor());
  }

  getObjectsCursor(): AsyncIterable<S3Object> {
    const stream = this.client.listObjectsV2(this.bucket, this.prefix, true);
    return mapAsync(stream, (item: Extract<BucketItem, { name: string }>) => new S3Object(this.module, this.getKey(item.name), `s3://${this.bucket}/${item.name}`, item.size, this));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getObject(key: string): Promise<S3Object> {
    const resourceUri = this.getResourceUriSync(key);
    return new S3Object(this.module, key, resourceUri, undefined, this);
  }

  async getResourceUri(key: string): Promise<string> { // eslint-disable-line @typescript-eslint/require-await
    return this.getResourceUriSync(key);
  }

  async getDownloadUrl(key: string, expirationTimestamp: number, responseHeaders?: Record<string, string>): Promise<string> {
    const bucketKey = this.getBucketKey(key);
    const { date, expiration } = getDateAndExpiration(expirationTimestamp);

    return await this.client.presignedGetObject(this.bucket, bucketKey, expiration, responseHeaders ?? {}, date);
  }

  async getUploadUrl(key: string, expirationTimestamp: number, options?: UploadUrlOptions): Promise<string> {
    const bucketKey = this.getBucketKey(key);
    const { date, expiration } = getDateAndExpiration(expirationTimestamp);
    const query = mapObjectKeys(options?.metadata ?? {}, (key) => `X-Amz-Meta-${key}`);

    return await this.client.presignedUrl('PUT', this.bucket, bucketKey, expiration, query, date);
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
