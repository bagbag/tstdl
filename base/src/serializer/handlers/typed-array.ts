import { SerializeHandler } from '../serialize-handler';
import { SerializedElement } from '../serialized-element';

const _global = (typeof globalThis == 'object' ? globalThis
  : typeof window == 'object' ? window
    : typeof self == 'object' ? self
      : typeof global == 'object' ? global : undefined) as NodeJS.Global;

if (_global == undefined) {
  throw new Error('could not get global');
}

type SerializedTypedArray = SerializedElement<number[]>;

type TypedArrayConstructor = new (buffer: ArrayBufferLike) => TypedArray;

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

const types: TypedArrayConstructor[] = [
  _global.Int8Array,
  _global.Uint8Array,
  _global.Int16Array,
  _global.Uint16Array,
  _global.Int32Array,
  _global.Uint32Array,
  _global.Float32Array,
  _global.Float64Array,
  _global.Buffer
].filter((type) => type != undefined);

export class TypedArraySerializeHandler implements SerializeHandler {
  canSerialize(obj: any): boolean {
    return types.some((type) => obj.constructor == type);
  }

  serialize(binary: TypedArray): SerializedTypedArray {
    const array = new Uint8Array(binary);
    const data = [...array.values()];

    return {
      type: binary.constructor.name,
      data
    };
  }

  canDeserialize(serialized: SerializedElement): boolean {
    return types.some(({ name }) => serialized.type == name);
  }

  deserialize({ type, data }: SerializedTypedArray): any {
    const array = new Uint8Array(data);
    const constructor = this.getType(type);

    return new constructor(array.buffer);
  }

  private getType(name: string): TypedArrayConstructor {
    const type = types.find((type) => name == type.name);

    if (type == undefined) {
      throw new Error(`type ${name} not supported`);
    }

    return type;
  }
}
