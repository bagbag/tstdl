import { Serializer } from '../serializer';

export function registerFunctionType(serializer: typeof Serializer): void {
  serializer.registerType(Function, (func) => func.toString(), (source) => eval(`(${source})`));
}
