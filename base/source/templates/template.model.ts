export type Template<Type extends string = string, Options = any> = {
  type: Type,
  template: string,
  options?: Options
};
