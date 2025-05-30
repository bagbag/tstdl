import '#/polyfills.js';

import { openAsBlob } from 'node:fs';

import { type Bucket, Storage } from '@google-cloud/storage';
import { FileState, GoogleGenAI } from '@google/genai';

import { AsyncEnumerable } from '#/enumerable/async-enumerable.js';
import { DetailsError } from '#/errors/details.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
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

  readonly #genAI = new GoogleGenAI({
    vertexai: isDefined(this.#options.vertex?.project),
    project: this.#options.vertex?.project,
    location: this.#options.vertex?.location,
    googleAuthOptions: isDefined(this.#options.vertex?.project) ? { apiKey: this.#options.apiKey, keyFile: this.#options.keyFile } : undefined,
    apiKey: isUndefined(this.#options.vertex?.project) ? assertDefinedPass(this.#options.apiKey, 'Api key not defined') : undefined,
  });

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

    const blob = inputIsBlob
      ? fileInput
      : await openAsBlob(fileInput.path, { type: fileInput.mimeType });

    this.#logger.verbose(`Uploading file "${id}" (${formatBytes(blob.size)})...`);

    if (isDefined(this.#storage)) {
      throw new NotImplementedError();
      /*
      const bucket = await this.getBucket();
      const [file] = await bucket.upload(path, { destination: id, contentType: mimeType });

      return {
        id,
        name: id,
        uri: file.cloudStorageURI.toString(),
        mimeType
      };
      */
    }

    const response = await this.#genAI.files.upload({ file: blob, config: { mimeType: blob.type } });

    return {
      id,
      name: assertDefinedPass(response.name, 'Missing file name'),
      uri: assertDefinedPass(response.uri, 'Missing file uri'),
      mimeType: assertDefinedPass(response.mimeType, 'Missing file mime type'),
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
            condition: { age: 1 },
          }],
        },
      });

      this.#bucket = bucket;
    }

    return this.#bucket!;
  }

  private async waitForFileActive(file: File): Promise<void> {
    if (isUndefined(this.#genAI)) {
      return;
    }

    let state = await this.#genAI.files.get({ name: file.name });

    while (state.state == FileState.PROCESSING) {
      await timeout(millisecondsPerSecond);
      state = await this.#genAI.files.get({ name: file.name });
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
