import * as path from 'node:path';

import { BadRequestError } from '#/errors/bad-request.error.js';
import { InjectArg, Singleton } from '#/injector/decorators.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Schema } from '#/schema/index.js';
import { Template } from '../template.model.js';
import { TemplateProvider } from '../template.provider.js';

export type FileTemplateProviderConfig = {
  basePath?: string
};

export type FileTemplateProviderArgument = string;

export const fileTemplateProviderConfig: FileTemplateProviderConfig = {};

const keyPattern = /^[\w\-/]+$/u;

@Singleton({
  defaultArgumentProvider: () => fileTemplateProviderConfig.basePath
})
export class FileTemplateProvider extends TemplateProvider implements Resolvable<FileTemplateProviderArgument> {
  private readonly basePath: string;

  declare readonly [resolveArgumentType]: FileTemplateProviderArgument;
  constructor(@InjectArg() basePath: string) {
    super();

    this.basePath = path.resolve(basePath);
  }

  async get<T extends Template = Template>(key: string): Promise<T> {
    if (!keyPattern.test(key)) {
      throw new BadRequestError('Illegal template key. Only a-z, A-Z, 0-9, _ and - are allowed.');
    }

    const filePath = path.resolve(this.basePath, `${key}.js`);

    if (!filePath.startsWith(this.basePath)) {
      throw new BadRequestError(`Illegal file path. Must be inside "${this.basePath}".`);
    }

    const templateModule = await import(filePath) as { template?: unknown, default?: unknown };
    const fileContent = templateModule.template ?? templateModule.default;

    return Schema.parse(Template, fileContent) as T;
  }
}

export function configureFileTemplateProvider(config: Partial<FileTemplateProviderConfig> = {}): void {
  fileTemplateProviderConfig.basePath = config.basePath ?? fileTemplateProviderConfig.basePath;
}
