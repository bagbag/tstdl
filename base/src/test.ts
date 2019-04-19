import './global-this';
import { Serializer, serialize, Serializable, deserialize } from './serializer';
import { randomBytes } from 'crypto';
import { Json } from './types';

class TestClass implements Serializable {
  name: string;

  static [deserialize](data: any): TestClass {
    return new TestClass(data.name);
  }

  constructor(name: string) {
    this.name = name;
  }

  [serialize](): Json {
    return { name: this.name };
  }
}

const object = {
  date: new Date(),
  hello: /blabla/gi,
  yo: {
    value: 3,
    no: undefined,
    name: ['Test', 'Test2'],
    yes: null
  }
};

Serializer.registerType(TestClass);
const serialized = Serializer.rawSerialize(object);
const deserialized = Serializer.rawDeserialize(serialized);
console.log(serialized);
console.log(deserialized);
