import { SerializeHandler } from '../serialize-handler';
import { SerializedElement } from '../serialized-element';

type SerializedBinary = SerializedElement<number[]>;

const type = 'array-buffer';

export class ArrayBufferSerializeHandler implements SerializeHandler {
  canSerialize(obj: any): boolean {
    return obj.constructor == ArrayBuffer;
  }

  serialize(buffer: ArrayBuffer): SerializedBinary {
    const array = new Uint8Array(buffer);
    const data = [...array.values()];

    return {
      type,
      data
    };
  }

  canDeserialize(serialized: SerializedElement): boolean {
    return serialized.type == type;
  }

  deserialize({ data }: SerializedBinary): ArrayBuffer {
    const array = new Uint8Array(data);
    return array.buffer;
  }
}
