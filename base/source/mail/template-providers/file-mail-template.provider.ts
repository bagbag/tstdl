import { Injectable, injectArg, resolveArgumentType, singleton } from '#/container';
import type { Schema } from '#/schema';
import { object, optional, string, unknown } from '#/schema';
import { TypedOmit } from '#/types';
import { isDefined } from '#/utils/type-guards';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MailTemplateProvider } from '../mail-template.provider';
import type { MailTemplate } from '../models';

export type FileMailTemplate = TypedOmit<MailTemplate, 'key'> & {
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
export class FileMailTemplateProvider extends MailTemplateProvider implements Injectable<FileMailTemplateProviderArgument> {
  private readonly basePath: string;

  readonly [resolveArgumentType]: FileMailTemplateProviderArgument;

  constructor(@injectArg() basePath: string) {
    super();

    this.basePath = basePath;
  }

  async get(key: string): Promise<MailTemplate> {
    const filePath = path.resolve(this.basePath, `${key}.json`);
    const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
    const fileMailTemplate = fileMailTemplateSchema.parse(JSON.parse(fileContent));

    const [subject, html, text] = await Promise.all([
      fileMailTemplate.subject ?? (isDefined(fileMailTemplate.subjectFile) ? fs.readFile(path.resolve(this.basePath, fileMailTemplate.subjectFile), { encoding: 'utf8' }) : undefined),
      fileMailTemplate.html ?? (isDefined(fileMailTemplate.htmlFile) ? fs.readFile(path.resolve(this.basePath, fileMailTemplate.htmlFile), { encoding: 'utf8' }) : undefined),
      fileMailTemplate.text ?? (isDefined(fileMailTemplate.textFile) ? fs.readFile(path.resolve(this.basePath, fileMailTemplate.textFile), { encoding: 'utf8' }) : undefined)
    ]);

    const template: MailTemplate = {
      key,
      type: fileMailTemplate.type,
      subject,
      html,
      text,
      options: fileMailTemplate.options
    };

    return template;
  }
}

export function configureFileMailTemplateProvider(config: Partial<FileMailTemplateProviderConfig> = {}): void {
  fileMailTemplateProviderConfig.basePath = config.basePath ?? fileMailTemplateProviderConfig.basePath;
}
