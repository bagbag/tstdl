import type { Injectable } from '#/container';
import { injectArg, resolveArgumentType, singleton } from '#/container';
import type { Schema } from '#/schema';
import { object, optional, string, unknown } from '#/schema';
import { FileTemplateProviderBase } from '#/templates/providers/file-template.provider.base';
import type { MailTemplateProvider } from '../mail-template.provider';
import type { MailTemplate } from '../models';

export type FileMailTemplate = MailTemplate & {
  /** subject template file */
  subjectFile?: string,

  /** html template file */
  htmlFile?: string,

  /** text template file */
  textFile?: string
};

export type FileMailTemplateProviderConfig = {
  basePath?: string
};

export type FileMailTemplateProviderArgument = string;

export const fileMailTemplateProviderConfig: FileMailTemplateProviderConfig = {};

const fileMailTemplateSchema: Schema<FileMailTemplate> = object({
  type: string(),
  subject: optional(string()),
  subjectFile: optional(string()),
  html: optional(string()),
  htmlFile: optional(string()),
  text: optional(string()),
  textFile: optional(string()),
  options: optional(unknown())
});

@singleton({
  defaultArgumentProvider: () => fileMailTemplateProviderConfig.basePath
})
export class FileMailTemplateProvider extends FileTemplateProviderBase<MailTemplate, FileMailTemplate> implements MailTemplateProvider, Injectable<FileMailTemplateProviderArgument> {
  readonly [resolveArgumentType]: FileMailTemplateProviderArgument;

  constructor(@injectArg() basePath: string) {
    super(fileMailTemplateSchema, basePath, [['subjectFile', 'subject'], ['htmlFile', 'html'], ['textFile', 'text']]);
  }
}

export function configureFileMailTemplateProvider(config: Partial<FileMailTemplateProviderConfig> = {}): void {
  fileMailTemplateProviderConfig.basePath = config.basePath ?? fileMailTemplateProviderConfig.basePath;
}

export function fileMailTemplate<T extends FileMailTemplate>(template: T): T {
  return template;
}
