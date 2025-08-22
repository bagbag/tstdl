# @tstdl/serializer

A powerful and extensible TypeScript serialization library that handles complex object graphs, including circular references, and supports a wide range of built-in and custom types. It produces a JSON-compatible output.

## Table of Contents
- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [API Summary](#api-summary)

## Features

- **Circular Reference Handling**: Automatically detects and handles cyclical object references.
- **Rich Type Support**: Out-of-the-box support for `Date`, `Map`, `Set`, `RegExp`, `Error`, `ArrayBuffer`, all `TypedArray` variants, and `Buffer`.
- **BigInt & Symbol Support**: Serializes `BigInt` and global `Symbol`s.
- **Extensibility**: Easily add support for custom classes by implementing a `Serializable` interface or registering a custom serializer.
- **JSON Compatibility**: Produces a plain JavaScript object structure that can be safely passed to `JSON.stringify`.
- **Contextual Serialization**: Reference pre-existing data at deserialization time to reduce payload size.
- **Unsafe Function Serialization**: Opt-in support for serializing functions (use with caution).

## Core Concepts

### Serialization Process

The `serialize` function traverses an object graph and converts it into a JSON-compatible structure.

1.  **Primitives**: `string`, `number`, `boolean`, and `null` are kept as-is. `undefined` is converted to a special object: `{ "<undefined>": null }`.
2.  **Built-in Types**: Complex built-in types like `Date`, `Map`, or `RegExp` are replaced with a special object wrapper that includes their data, e.g., `{ "<Date>": 1672531200000 }`.
3.  **Circular References**: The serializer keeps track of every object it has visited. If it encounters the same object again (a circular reference), it replaces it with a reference object, e.g., `{ "<ref>": "$" }`, where `$` is a path to the first occurrence of the object.

### Deserialization Process

The `deserialize` function reconstructs the original object graph from the serialized data. It's a multi-pass process to correctly handle references.

1.  **Structure Building**: The function first builds the main structure of the object graph. When it encounters a reference (`<ref>`) or a custom type, it may create a temporary placeholder (`ForwardRef`).
2.  **Reference Resolution**: In subsequent passes, it resolves all placeholders, linking cyclical references and fully constructing custom objects. This ensures that the entire graph is correctly reassembled.

### Making Classes Serializable

There are two ways to make your custom classes compatible with the serializer:

1.  **Implement the `Serializable` interface**: This is the preferred method for classes you own. You implement `[Serializable.serialize]` and `[Serializable.deserialize]` methods and register the class with the `@serializable()` decorator or `registerSerializable()` function.

2.  **Register a Serializer**: For classes you don't control (e.g., from a third-party library), you can use `registerSerializer()`. This function takes a constructor, a type name, and separate `serialize` and `deserialize` functions, teaching the serializer how to handle that type.

## Usage

### Basic Serialization

The `stringSerialize` and `stringDeserialize` functions are the easiest way to convert an object to a JSON string and back.

```typescript
import { stringSerialize, stringDeserialize } from '@tstdl/serializer';

const user = {
  name: 'John Doe',
  age: 30,
  lastLogin: new Date('2023-01-01T00:00:00.000Z')
};

const jsonString = stringSerialize(user);
console.log(jsonString);
// Outputs: {"name":"John Doe","age":30,"lastLogin":{"<Date>":1672531200000}}

const deserializedUser = stringDeserialize(jsonString);
console.log(deserializedUser.lastLogin instanceof Date); // true
console.log(deserializedUser);
// Outputs: { name: 'John Doe', age: 30, lastLogin: 2023-01-01T00:00:00.000Z }
```

### Handling Circular References

The serializer automatically handles cycles in your object graph.

```typescript
import { serialize, deserialize } from '@tstdl/serializer';

const user: any = { name: 'Alice' };
const product = { name: 'Laptop', owner: user };
user.products = [product]; // Create a circular reference

const serialized = serialize(user);
console.log(JSON.stringify(serialized, null, 2));
/*
Outputs:
{
  "name": "Alice",
  "products": [
    {
      "name": "Laptop",
      "owner": {
        "<ref>": "$"
      }
    }
  ]
}
*/

const deserialized = deserialize(serialized);
console.log(deserialized.products[0].owner === deserialized); // true
```

### Custom Serializable Class

Implement the `Serializable` interface and use the `@serializable` decorator for your classes.

```typescript
import {
  Serializable,
  serializable,
  serialize,
  deserialize,
  type TryDereference
} from '@tstdl/serializer';

type PetData = { name: string; age: number };

@serializable('Pet')
class Pet implements Serializable<Pet, PetData> {
  constructor(public name: string, public age: number) {}

  [Serializable.serialize](): PetData {
    return { name: this.name, age: this.age };
  }

  [Serializable.deserialize](data: PetData): Pet {
    return new Pet(data.name, data.age);
  }
}

const myPet = new Pet('Fido', 5);
const serializedPet = serialize(myPet);
// serializedPet is: { "<Pet>": { "name": "Fido", "age": 5 } }

const deserializedPet = deserialize(serializedPet);
console.log(deserializedPet instanceof Pet); // true
console.log(deserializedPet.name); // "Fido"
```

### Registering a Custom Serializer

For classes you cannot modify, use `registerSerializer`.

```typescript
import {
  registerSerializer,
  serialize,
  deserialize
} from '@tstdl/serializer';

class Car {
  constructor(public make: string, public model: string) {}
}

// Register the Car class
registerSerializer(
  Car,
  'Car',
  (instance: Car) => ({ make: instance.make, model: instance.model }), // Serialize function
  (data: { make: string; model: string }) => new Car(data.make, data.model) // Deserialize function
);

const myCar = new Car('Toyota', 'Camry');
const serializedCar = serialize(myCar);
// serializedCar is: { "<Car>": { "make": "Toyota", "model": "Camry" } }

const deserializedCar = deserialize(serializedCar);
console.log(deserializedCar instanceof Car); // true
console.log(deserializedCar.model); // "Camry"
```

### Using a Context

Provide a `context` object during serialization to avoid embedding shared data. The same context must be provided during deserialization.

```typescript
import { serialize, deserialize } from '@tstdl/serializer';

const sharedConfig = { theme: 'dark', version: '1.0' };

const userProfile = {
  username: 'testuser',
  config: sharedConfig
};

const serialized = serialize(userProfile, {
  context: { config: sharedConfig }
});

console.log(JSON.stringify(serialized));
// Outputs: {"username":"testuser","config":{"<ref>":"$['__context__']['config']"}}

const deserialized = deserialize(serialized, {
  context: { config: sharedConfig }
});

console.log(deserialized.config === sharedConfig); // true
```

### Unsafe Serialization of Functions

You can serialize functions by enabling the `allowUnsafe` option.

**Warning**: This can lead to Remote Code Execution (RCE) if you deserialize data from an untrusted source. Only use this feature when you fully control both the serialization and deserialization environments.

```typescript
import { serialize, deserialize } from '@tstdl/serializer';

const calculator = {
  operation: 'add',
  execute: (a: number, b: number) => a + b
};

try {
  serialize(calculator);
} catch (e) {
  console.error(e.message); // functions are only allowed if allowUnsafe option is true
}

const serialized = serialize(calculator, { allowUnsafe: true });

const deserialized = deserialize(serialized, { allowUnsafe: true });
console.log(deserialized.execute(5, 3)); // 8
```

## API Summary

| Function/Decorator | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `serialize<T>` | `value: T`, `options?: SerializationOptions` | `Serialized<T>` | Serializes a value into a JSON-compatible object structure. |
| `deserialize<T>` | `serialized: Serialized<T>`, `options?: SerializationOptions` | `T` | Deserializes an object structure back into its original form. |
| `stringSerialize<T>` | `value: T`, `options?: SerializationOptions` | `StringSerialized<T>` | Serializes a value and returns it as a JSON string. |
| `stringDeserialize<T>` | `serialized: string`, `options?: SerializationOptions` | `T` | Deserializes a JSON string back into its original object. |
| `registerSerializer` | `constructor`, `typeName`, `serializer`, `deserializer` | `void` | Registers a custom serializer/deserializer pair for a given class constructor. |
| `registerSerializable` | `type`, `typeName?` | `void` | Registers a class that implements the `Serializable` interface. |
| `@serializable()` | `typeName?: string` | `ClassDecorator` | Decorator to register a class that implements the `Serializable` interface. |
| `registerRawSerializable` | `constructor` | `void` | Registers a constructor whose instances should not be serialized but passed through as-is. |