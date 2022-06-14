export type MailTemplate<Type extends string = string, Options = any> = {
  type: Type,

  /** subject template */
  subject?: string,

  /** html template */
  html?: string,

  /** text template */
  text?: string,

  options?: Options
};
