import { SerializeHandler } from '../serialize-handler';
import { SerializedElement } from '../serialized-element';

type SerializedBinary = SerializedElement<number[]>;

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
// | BigInt64Array
// | BigUint64Array

const types: { type: TypedArrayConstructor, name: string }[] = [
  // { type: SharedArrayBuffer, name: SharedArrayBuffer.name },
  { type: Int8Array, name: Int8Array.name },
  { type: Uint8Array, name: Uint8Array.name },
  { type: Uint8ClampedArray, name: Uint8ClampedArray.name },
  { type: Int16Array, name: Int16Array.name },
  { type: Uint16Array, name: Uint16Array.name },
  { type: Int32Array, name: Int32Array.name },
  { type: Uint32Array, name: Uint32Array.name },
  { type: Float32Array, name: Float32Array.name },
  { type: Float64Array, name: Float64Array.name },
  // { type: BigInt64Array,  name:BigInt64Array.name },
  // { type: BigUint64Array,  name:BigUint64Array.name }
];

export class TypedArraySerializeHandler implements SerializeHandler {
  canSerialize(obj: any): boolean {
    return types.some(({ type }) => obj.constructor == type);
  }

  serialize(binary: TypedArray): SerializedBinary {
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

  deserialize({ type, data }: SerializedBinary): any {
    const array = new Uint8Array(data);
    const constructor = this.getType(type);

    return new constructor(array.buffer);
  }

  private getType(name: string): TypedArrayConstructor {
    const type = types.find(({ name: _name }) => name == _name);

    if (type == undefined) {
      throw new Error(`type ${name} not supported`);
    }

    return type.type;
  }
}
