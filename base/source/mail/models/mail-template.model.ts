import type { Template, TemplateField } from '#/templates/template.model.js';
import type { Record } from '#/types.js';

export type MailTemplate<Context extends Record = any> = Template<{ subject: false, html: false, text: false }, undefined, Context>;

type MailTemplateFields<Context extends Record> = {
  subject?: TemplateField<string, string, any, Context>,
  html?: TemplateField<string, string, any, Context>,
  text?: TemplateField<string, string, any, Context>
};

export function mailTemplate<Context extends Record>(name: string, fields: MailTemplateFields<Context>): MailTemplate<Context> {
  return {
    name,
    fields
  };
}
