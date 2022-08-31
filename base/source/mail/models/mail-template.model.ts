import type { Template, TemplateField } from '#/templates';

export type MailTemplate = Template<{ subject: false, html: false, text: false }, undefined>;

export function mailTemplate(fields: { subject?: TemplateField, html?: TemplateField, text?: TemplateField }): MailTemplate {
  return {
    fields
  };
}
