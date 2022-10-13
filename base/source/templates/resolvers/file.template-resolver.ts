import type { Injectable } from '#/container';
import { injectArg, resolveArgumentType, singleton } from '#/container';
import { BadRequestError } from '#/error/bad-request.error';
import { Property } from '#/schema';
import { TypedOmit } from '#/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TemplateField } from '../template.model';
import { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer';
import { TemplateResolver } from '../template.resolver';

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
