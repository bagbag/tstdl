import { BadRequestError } from '#/error/bad-request.error';
import { Schema } from '#/schema';
import type { Record, TypedOmit } from '#/types';
import { assertStringPass, isDefined } from '#/utils/type-guards';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Template } from '../template.model';

export type FileTemplateBase = TypedOmit<Template, 'template'>;

export type FileForward<T extends FileTemplateBase, U extends FileTemplateBase> = [fileKey: keyof U, targetKey: keyof T];

const keyPattern = /^[\w\-/]+$/u;

export class FileTemplateProviderBase<T extends FileTemplateBase, U extends FileTemplateBase> {
  private readonly schema: Schema<U>;
  private readonly basePath: string;
  private readonly fileForwards: Map<keyof U, keyof T>;

  constructor(schema: Schema<U>, basePath: string, fileForwards: FileForward<T, U>[]) {
    this.schema = schema;
    this.basePath = basePath;
    this.fileForwards = new Map(fileForwards);
  }

  async get(key: string): Promise<T> {
    if (!keyPattern.test(key)) {
      throw new BadRequestError('Illegal template key. Only a-z, A-Z, 0-9, _ and - are allowed.');
    }

    const filePath = path.resolve(this.basePath, `${key}.js`);
    const templateModule = await import(filePath) as { default: unknown };
    const fileContent = templateModule.default;
    const fileTemplate = Schema.parse(this.schema, fileContent);

    const result: Record = {};
    const entries = Object.entries(fileTemplate) as [keyof U, keyof T][];

    for (const [property, value] of entries) {
      if (!this.fileForwards.has(property)) {
        result[property] = value;
      }
    }

    for (const [fileKey, targetKey] of this.fileForwards) {
      if (isDefined(result[targetKey])) {
        if (isDefined(fileTemplate[fileKey])) {
          throw new Error(`Either ${fileKey.toString()} or ${targetKey.toString()} must be defined.`);
        }

        continue;
      }

      if (isDefined(fileTemplate[fileKey])) {
        const contentFilePath = assertStringPass(fileTemplate[fileKey], 'File path must be a string.');
        const content = await fs.readFile(path.resolve(this.basePath, contentFilePath), { encoding: 'utf8' });

        result[targetKey] = content as any;
        continue;
      }

      throw new Error(`Either ${fileKey.toString()} or ${targetKey.toString()} must be defined.`);
    }

    return result;
  }
}
