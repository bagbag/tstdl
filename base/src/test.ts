import './global-this';
import { Serializer } from './serializer';

const object = {
  date: new Date(),
  hello: /blabla/gi,
  yo: {
    value: 3,
    name: 'Test'
  }
};

const serialized = Serializer.serialize(object);
const deserialized = Serializer.deserialize(serialized);
console.log(serialized);
console.log(deserialized);
