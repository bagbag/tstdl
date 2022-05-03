export type MailTemplate<Type extends string = string, Options = any> = {
  key: string,
  type: Type,

  /** subject template */
  subject?: string,

  /** html template */
  html?: string,

  /** text template */
  text?: string,

  options?: Options
};
