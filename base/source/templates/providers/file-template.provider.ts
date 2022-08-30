import type { Injectable } from '#/container';
import { injectArg, resolveArgumentType, singleton } from '#/container';
import { object, optional, string, unknown } from '#/schema';
import type { Template } from '../template.model';
import type { TemplateProvider } from '../template.provider';
import type { FileTemplateBase } from './file-template.provider.base';
import { FileTemplateProviderBase } from './file-template.provider.base';

export type FileTemplate<T extends Template = Template> = FileTemplateBase<T> & {
  template?: string,

  /** subject template file */
  templateFile?: string
};

export type FileTemplateProviderConfig = {
  basePath?: string
};

export type FileTemplateProviderArgument = string;

export const fileTemplateProviderConfig: FileTemplateProviderConfig = {};

const fileTemplateSchema = object<FileTemplate>({
  type: string(),
  template: optional(string()),
  templateFile: optional(string()),
  options: optional(unknown())
});

@singleton({
  defaultArgumentProvider: () => fileTemplateProviderConfig.basePath
})
export class FileTemplateProvider extends FileTemplateProviderBase<Template, FileTemplate> implements TemplateProvider, Injectable<FileTemplateProviderArgument> {
  readonly [resolveArgumentType]: FileTemplateProviderArgument;

  constructor(@injectArg() basePath: string) {
    super(fileTemplateSchema, basePath, [['templateFile', 'template']]);
  }
}

export function configureFileTemplateProvider(config: Partial<FileTemplateProviderConfig> = {}): void {
  fileTemplateProviderConfig.basePath = config.basePath ?? fileTemplateProviderConfig.basePath;
}

export function fileTemplate<T extends Template = Template>(template: FileTemplate<T>): FileTemplate<T> {
  return template;
}
