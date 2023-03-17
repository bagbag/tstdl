import type { Template, TemplateField } from '#/templates/template.model.js';

export type MailTemplate<Context extends object = any> = Template<{ subject: false, html: false, text: false }, undefined, Context>;

export function mailTemplate<Context extends object>(name: string, fields: { subject?: TemplateField, html?: TemplateField, text?: TemplateField }): MailTemplate<Context> {
  return {
    name,
    fields
  };
}
