import { ArraySerializeHandler, DateSerializeHandler, ObjectSerializeHandler, PrimitivesSerializeHandler, PrototypeSerializeHandler, RegexSerializeHandler } from './handlers';
import { ArrayBufferSerializeHandler } from './handlers/array-buffer';
import { TypedArraySerializeHandler } from './handlers/typed-array';
import { SerializableStatic } from './serializable';
import { SerializeHandler } from './serialize-handler';
import { SerializedElement } from './serialized-element';

declare const serializedSymbol: unique symbol;

export type Serialized<T> = { _: typeof serializedSymbol } & SerializedElement;

interface SerializerStatic {
  registerHandler(...handlers: SerializeHandler[]): void;
  registerPrototype(prototype: SerializableStatic): void;

  serialize(obj: any): string;
  rawSerialize<T>(obj: T): Serialized<T>;

  deserialize<T = unknown>(serializedStringOrElement: string | Serialized<T>): T;
}

// tslint:disable-next-line: class-name
class _Serializer {
  private static readonly handlers: SerializeHandler[] = [];

  private static prototypeSerializeHandler: PrototypeSerializeHandler;

  static setPrototypeSerializerHandler(prototypeSerializeHandler: PrototypeSerializeHandler): void {
    _Serializer.prototypeSerializeHandler = prototypeSerializeHandler;
  }

  static registerHandler(...handlers: SerializeHandler[]): void {
    _Serializer.handlers.push(...handlers);
  }

  static registerPrototype(prototype: SerializableStatic): void {
    _Serializer.prototypeSerializeHandler.register(prototype);
  }

  static serialize(obj: any): string {
    const serializedElement = _Serializer.rawSerialize(obj);
    const serializedString = JSON.stringify(serializedElement);

    return serializedString;
  }

  static rawSerialize<T>(obj: T): Serialized<T> {
    const handler = _Serializer.getSerializationHandler(obj);
    const serializedElement = handler.serialize(obj);

    return serializedElement as any as Serialized<T>;
  }

  static deserialize<T = unknown>(serializedStringOrElement: string | Serialized<T>): T {
    const serializedElement: SerializedElement = (typeof serializedStringOrElement == 'string')
      ? JSON.parse(serializedStringOrElement) as SerializedElement
      : serializedStringOrElement as any as SerializedElement;

    const handler = _Serializer.getDeserializationHandler(serializedElement);
    const result = handler.deserialize(serializedElement);

    return result;
  }

  private static getSerializationHandler(obj: any): SerializeHandler {
    const handler = _Serializer.handlers.find((handler) => handler.canSerialize(obj));

    if (handler == undefined) {
      const constructorName = Object.getPrototypeOf(obj).constructor.name;
      throw new Error(`no suitable handler available for prototype ${constructorName}`);
    }

    return handler;
  }

  private static getDeserializationHandler(serializedElement: SerializedElement): SerializeHandler {
    const handler = _Serializer.handlers.find((handler) => handler.canDeserialize(serializedElement));

    if (handler == undefined) {
      throw new Error(`no suitable handler available for ${serializedElement.type}`);
    }

    return handler;
  }
}

const prototypeSerializeHandler = new PrototypeSerializeHandler();

const handlers: SerializeHandler[] = [
  new PrimitivesSerializeHandler(),
  new ObjectSerializeHandler(),
  new ArraySerializeHandler(),
  new DateSerializeHandler(),
  new RegexSerializeHandler(),
  new ArrayBufferSerializeHandler(),
  new TypedArraySerializeHandler(),
  prototypeSerializeHandler
];

_Serializer.setPrototypeSerializerHandler(prototypeSerializeHandler);
_Serializer.registerHandler(...handlers);
