import '#/polyfills.js';

import { type Bucket, Storage } from '@google-cloud/storage';
import { FileState, GoogleAIFileManager } from '@google/generative-ai/server';

import { AsyncEnumerable } from '#/enumerable/async-enumerable.js';
import { DetailsError } from '#/errors/details.error.js';
import { TemporaryFile } from '#/file/temporary-file.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { createArray } from '#/utils/array/array.js';
import { formatBytes } from '#/utils/format.js';
import { timeout } from '#/utils/timing.js';
import { assertDefinedPass, isBlob, isDefined, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import type { AiServiceOptions } from './ai.service.js';
import type { FileContentPart, FileInput } from './types.js';

export type AiFileServiceOptions = Pick<AiServiceOptions, 'apiKey' | 'keyFile' | 'vertex'>;

export type AiFileServiceArgument = AiFileServiceOptions;

type File = {
  id: string,
  name: string,
  uri: string,
  mimeType: string
};

@Singleton()
export class AiFileService implements Resolvable<AiFileServiceArgument> {
  readonly #options = injectArgument(this);
  readonly #fileManager = isUndefined(this.#options.vertex) ? new GoogleAIFileManager(assertDefinedPass(this.#options.apiKey, 'Api key not defined')) : undefined;
  readonly #storage = isDefined(this.#options.vertex) ? new Storage({ keyFile: assertDefinedPass(this.#options.keyFile, 'Key file not defined'), projectId: this.#options.vertex.project }) : undefined;
  readonly #fileMap = new Map<string, File>();
  readonly #fileUriMap = new Map<string, File>();
  readonly #logger = inject(Logger, 'AiFileService');

  #bucket: Bucket | undefined;

  declare readonly [resolveArgumentType]: AiFileServiceArgument;

  async processFile(fileInput: FileInput): Promise<FileContentPart> {
    const file = await this.getFile(fileInput);

    this.#fileMap.set(file.id, file);
    this.#fileUriMap.set(file.uri, file);

    return { file: file.id };
  }

  async processFiles(fileInputs: FileInput[]): Promise<FileContentPart[]> {
    const files = await this.getFiles(fileInputs);

    return files.map((file) => {
      this.#fileMap.set(file.id, file);
      this.#fileUriMap.set(file.uri, file);

      return { file: file.id };
    });
  }

  getFileById(id: string): File | undefined {
    return this.#fileMap.get(id);
  }

  getFileByUri(uri: string): File | undefined {
    return this.#fileUriMap.get(uri);
  }

  private async getFile(fileInput: FileInput): Promise<File> {
    const id = crypto.randomUUID();

    const file = await this.uploadFile(fileInput, id);

    this.#logger.verbose(`Processing file "${id}"...`);
    await this.waitForFileActive(file);

    return file;
  }

  private async getFiles(fileInputs: readonly FileInput[]): Promise<File[]> {
    const ids = createArray(fileInputs.length, () => crypto.randomUUID());

    const files = await AsyncEnumerable.from(fileInputs).parallelMap(5, true, async (file, index) => this.uploadFile(file, ids[index]!)).toArray();

    this.#logger.verbose(`Processing ${fileInputs.length} files...`);
    await this.waitForFilesActive(files);

    return files;
  }

  private async uploadFile(fileInput: FileInput, id: string): Promise<File> {
    const inputIsBlob = isBlob(fileInput);

    await using tmpFile = inputIsBlob
      ? await TemporaryFile.from(fileInput.stream())
      : undefined;

    const path = inputIsBlob ? tmpFile!.path : fileInput.path;
    const mimeType = inputIsBlob ? fileInput.type : fileInput.mimeType;
    const fileSize = inputIsBlob ? fileInput.size : await tmpFile!.size();

    this.#logger.verbose(`Uploading file "${id}" (${formatBytes(fileSize)})...`);

    if (isDefined(this.#storage)) {
      const bucket = await this.getBucket();
      const [file] = await bucket.upload(path, { destination: id, contentType: mimeType });

      return {
        id,
        name: id,
        uri: file.cloudStorageURI.toString(),
        mimeType
      };
    }

    const response = await this.#fileManager!.uploadFile(path, { mimeType });

    return {
      id,
      name: response.file.name,
      uri: response.file.uri,
      mimeType: response.file.mimeType
    };
  }

  private async getBucket(): Promise<Bucket> {
    if (isUndefined(this.#options.vertex)) {
      throw new Error('Not using Vertex');
    }

    if (isDefined(this.#bucket)) {
      return this.#bucket;
    }

    const bucketName = assertDefinedPass(this.#options.vertex.bucket, 'Bucket not specified');
    const [exists] = await this.#storage!.bucket(bucketName).exists();

    if (!exists) {
      const [bucket] = await this.#storage!.createBucket(bucketName, {
        location: this.#options.vertex.location,
        lifecycle: {
          rule: [{
            action: { type: 'Delete' },
            condition: { age: 1 }
          }]
        }
      });

      this.#bucket = bucket;
    }

    return this.#bucket!;
  }

  private async waitForFileActive(file: File): Promise<void> {
    if (isUndefined(this.#fileManager)) {
      return;
    }

    let state = await this.#fileManager.getFile(file.name);

    while (state.state == FileState.PROCESSING) {
      await timeout(millisecondsPerSecond);
      state = await this.#fileManager.getFile(file.name);
    }

    if (state.state == FileState.FAILED) {
      throw new DetailsError(state.error?.message ?? `Failed to process file ${state.name}`, state.error?.details);
    }
  }

  private async waitForFilesActive(files: File[]): Promise<void> {
    for (const file of files) {
      await this.waitForFileActive(file);
    }
  }
}
