import '#/polyfills.js';

import { stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import { type FileMetadataResponse, FileState, GoogleAIFileManager } from '@google/generative-ai/server';

import { AsyncEnumerable } from '#/enumerable/async-enumerable.js';
import { DetailsError } from '#/errors/details.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import { Resolvable, type resolveArgumentType } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { createArray } from '#/utils/array/array.js';
import { formatBytes } from '#/utils/format.js';
import { timeout } from '#/utils/timing.js';
import { tryIgnoreAsync } from '#/utils/try-ignore.js';
import { isBlob } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import { FileContentPart, FileInput, AiModel } from './types.js';

export type AiFileServiceOptions = {
  apiKey: string,
  defaultModel?: AiModel
};

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
  readonly #fileManager = new GoogleAIFileManager(this.#options.apiKey);
  readonly #fileMap = new Map<string, File>();
  readonly #fileUriMap = new Map<string, File>();
  readonly #logger = inject(Logger, 'AiFileService');

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
    const uploadResponse = await this.uploadFile(fileInput, id);

    this.#logger.verbose(`Processing file "${id}"...`);
    const response = await this.waitForFileActive(uploadResponse);

    return {
      id,
      name: response.name,
      uri: response.uri,
      mimeType: response.mimeType
    };
  }

  private async getFiles(files: readonly FileInput[]): Promise<File[]> {
    const ids = createArray(files.length, () => crypto.randomUUID());

    const uploadResponses = await AsyncEnumerable.from(files).parallelMap(5, true, async (file, index) => this.uploadFile(file, ids[index]!)).toArray();

    this.#logger.verbose(`Processing ${files.length} files...`);
    const responses = await this.waitForFilesActive(uploadResponses);

    return responses.map((response, index) => ({
      id: ids[index]!,
      name: response.name,
      uri: response.uri,
      mimeType: response.mimeType
    }));
  }

  private async uploadFile(fileInput: FileInput, id: string): Promise<FileMetadataResponse> {
    const path = isBlob(fileInput) ? join(tmpdir(), crypto.randomUUID()) : fileInput.path;
    const mimeType = isBlob(fileInput) ? fileInput.type : fileInput.mimeType;

    await using stack = new AsyncDisposableStack();

    if (isBlob(fileInput)) {
      this.#logger.verbose(`Preparing file "${id}"...`);
      stack.defer(async () => tryIgnoreAsync(async () => unlink(path)));
      await writeFile(path, fileInput.stream() as NodeReadableStream);
    }

    const fileSize = isBlob(fileInput) ? fileInput.size : (await stat(path)).size;

    this.#logger.verbose(`Uploading file "${id}" (${formatBytes(fileSize)})...`);
    const response = await this.#fileManager.uploadFile(path, { mimeType });

    return response.file;
  }

  private async waitForFileActive(fileMetadata: FileMetadataResponse): Promise<FileMetadataResponse> {
    let file = await this.#fileManager.getFile(fileMetadata.name);

    while (file.state == FileState.PROCESSING) {
      await timeout(millisecondsPerSecond);
      file = await this.#fileManager.getFile(fileMetadata.name);
    }

    if (file.state == FileState.FAILED) {
      throw new DetailsError(file.error?.message ?? `Failed to process file ${file.name}`, file.error?.details);
    }

    return file;
  }

  private async waitForFilesActive(files: FileMetadataResponse[]): Promise<FileMetadataResponse[]> {
    const responses: FileMetadataResponse[] = [];

    for (const file of files) {
      const respones = await this.waitForFileActive(file);
      responses.push(respones);
    }

    return responses;
  }
}
