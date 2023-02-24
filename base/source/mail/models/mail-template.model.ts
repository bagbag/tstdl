import type { Template, TemplateField } from '#/templates/template.model.js';

export type MailTemplate = Template<{ subject: false, html: false, text: false }, undefined>;

export function mailTemplate(name: string, fields: { subject?: TemplateField, html?: TemplateField, text?: TemplateField }): MailTemplate {
  return {
    name,
    fields
  };
}
