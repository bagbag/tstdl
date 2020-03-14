import { registerSerializationType } from '../serializer';

export function registerFunctionType(register: typeof registerSerializationType): void {
  // eslint-disable-next-line no-eval, @typescript-eslint/no-unsafe-return
  register(Function, (func) => func.toString(), (source) => eval(`(${source})`));
}
