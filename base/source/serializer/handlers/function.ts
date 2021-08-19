import { registerSerializationType } from '../serializer';

export function registerFunctionType(): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, no-eval
  registerSerializationType(Function, (func) => func.toString(), (source) => eval(`(${source})`));
}
