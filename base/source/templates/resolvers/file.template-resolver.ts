import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { BadRequestError } from '#/errors/bad-request.error.js';
import { InjectArg, Singleton } from '#/injector/decorators.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { resolveArgumentType } from '#/injector/interfaces.js';
import { Property } from '#/schema/index.js';
import type { TypedOmit } from '#/types.js';
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

@Singleton({
  defaultArgumentProvider: () => fileTemplateProviderConfig.basePath
})
export class FileTemplateResolver extends TemplateResolver<FileTemplateField> implements Resolvable<FileTemplateProviderArgument> {
  private readonly basePath: string;

  declare readonly [resolveArgumentType]: FileTemplateProviderArgument;
  constructor(@InjectArg() basePath: string) {
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
