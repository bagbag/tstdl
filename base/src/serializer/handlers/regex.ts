import { registerSerializationType } from '../serializer';

export function registerRegExpType(register: typeof registerSerializationType): void {
  register(RegExp, serialize, deserialize);
}

type RegExpData = {
  pattern: string,
  flags: string
};

function serialize(regex: RegExp): RegExpData {
  return {
    pattern: regex.source,
    flags: regex.flags
  };
}

function deserialize({ pattern, flags }: RegExpData): RegExp {
  return new RegExp(pattern, flags);
}
