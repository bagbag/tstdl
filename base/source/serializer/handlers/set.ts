import type { Serialized } from '../serializer';
import { rawDeserialize, rawSerialize, registerSerializationType } from '../serializer';

type SetData = Serialized<any>[];

export function registerSetType(): void {
  registerSerializationType(Set, serializeSet, deserializeSet);
}

function serializeSet(set: Set<any>): SetData {
  const data: SetData = [...set.values()].map((value) => rawSerialize(value));
  return data;
}

function deserializeSet(data: SetData): Set<any> {
  const values = data.map(rawDeserialize);
  return new Set(values);
}
