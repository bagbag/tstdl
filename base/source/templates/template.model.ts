export type Template<Type extends string = string, Options = any> = {
  type: Type,
  template: string,
  options?: Options
};

export function template<T extends Template = Template>(template: T): T {
  return template;
}
