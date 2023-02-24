import type { Injectable } from '#/container/index.js';
import { injectArg, resolveArgumentType, singleton } from '#/container/index.js';
import { BadRequestError } from '#/error/bad-request.error.js';
import { Property } from '#/schema/index.js';
import type { TypedOmit } from '#/types.js';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { TemplateField } from '../template.model.js';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer.js';
import { TemplateResolver } from '../template.resolver.js';

export type FileTemplateProviderConfig = {
  basePath?: string
};

export type FileTemplateProviderArgument = string;

export const fileTemplateProviderConfig: FileTemplateProviderConfig = {};

export class FileTemplateField<Renderer extends string = string, Options = any> extends TemplateField<'file', Renderer, Options> {
  @Property()
  templateFile: string;
}

@singleton({
  defaultArgumentProvider: () => fileTemplateProviderConfig.basePath
})
export class FileTemplateResolver extends TemplateResolver<FileTemplateField> implements Injectable<FileTemplateProviderArgument> {
  private readonly basePath: string;

  readonly [resolveArgumentType]: FileTemplateProviderArgument;
  constructor(@injectArg() basePath: string) {
    super();

    this.basePath = path.resolve(basePath);
  }

  canHandle(resolver: string): boolean {
    return (resolver == 'file');
  }

  async resolve(field: FileTemplateField): Promise<string> {
    const filePath = path.resolve(this.basePath, field.templateFile);

    if (!filePath.startsWith(this.basePath)) {
      throw new BadRequestError(`Illegal file path. Must be inside "${this.basePath}".`);
    }

    return fs.readFile(filePath, { encoding: 'utf8' });
  }
}

export function fileTemplateField<Renderer extends TemplateRenderer>(field: TypedOmit<FileTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]>, 'resolver'>): FileTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]> {
  return { resolver: 'file', ...field };
}

export function configureFileTemplateResolver(config: Partial<FileTemplateProviderConfig> = {}): void {
  fileTemplateProviderConfig.basePath = config.basePath ?? fileTemplateProviderConfig.basePath;
}
