# Decorators Module

A powerful and unified toolkit for creating and managing TypeScript decorators, complete with a runtime reflection system.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [API Summary](#api-summary)

## Features

- **Unified Decorator Creation**: A single, consistent API to create class, property, method, accessor, and parameter decorators.
- **Runtime Reflection**: A global registry collects metadata from decorators, allowing for powerful runtime introspection of classes, their properties, methods, and parameters.
- **Custom Metadata**: Easily attach custom data to any decorated element.
- **Inheritance Support**: Decorator metadata is automatically inherited from parent classes.
- **Decorator Wrapping**: Enhance or modify existing third-party decorators without altering their source code.

## Core Concepts

### Decorator Factories

This module provides a set of factory functions (e.g., `Class()`, `Property()`, `Method()`) that generate actual TypeScript decorators. They abstract away the boilerplate of handling different decorator targets and signatures.

The most generic factory is `Decorate()`, which can create a decorator applicable to any target. The more specific factories like `Property()` create decorators that can only be applied to properties, providing better type safety.

### Decorator Handler

When creating a decorator, you can provide a `handler` function. This function contains your decorator's logic and is executed when the decorator is applied. It receives two key arguments:

1.  `DecoratorData`: An object containing contextual information about where the decorator is being used (e.g., the class constructor, the property key, whether it's static).
2.  `DecoratorMetadata`: A reference to the metadata object for the decorated element within the reflection registry. You can use this to read or write custom data.

### Reflection Registry

The cornerstone of this module is the `reflectionRegistry`, a global singleton that collects and organizes metadata from every decorator created by the module's factories.

When a decorator is applied to a class member, it registers metadata about that member. Later, you can query the registry for a specific class constructor (`reflectionRegistry.getMetadata(User)`) to retrieve a `TypeMetadata` object. This object contains comprehensive, structured information about the class, including its properties, methods, parameters, and any custom data attached via decorators. This enables advanced framework-level features like dependency injection, serialization, and ORM mapping.

## Usage

### Creating a Simple Class Decorator

Use the `Class()` factory to create a decorator that can be applied to classes. This is useful for marking classes with specific roles, like making them injectable.

```typescript
import { Class, reflectionRegistry } from '@tstdl/decorators';
import { ContextDataMap } from '@tstdl/data-structures';

// Define a key for our metadata
const INJECTABLE_KEY = Symbol('injectable');

// Create the decorator using the Class factory
function Injectable() {
  Class({
    handler: (_data, metadata) => {
      // Attach metadata to the class
      metadata.data.set(INJECTABLE_KEY, true);
    },
  });
}

@Injectable()
class UserService {
  // ...
}

// Later, you can check for this metadata
const userServiceMetadata = reflectionRegistry.getMetadata(UserService);
const isInjectable = userServiceMetadata?.data.get(INJECTABLE_KEY); // true
```

### Creating Property and Parameter Decorators

Decorators can be used to tag properties and parameters, which is common for serialization or dependency injection.

```typescript
import { Property, Parameter, reflectionRegistry } from '@tstdl/decorators';

const SERIALIZABLE_KEY = Symbol('serializable');
const INJECT_KEY = Symbol('inject');

// A decorator to mark properties for serialization
function Serializable() {
  Property({
    data: { [SERIALIZABLE_KEY]: true },
  });
}

// A decorator to mark constructor parameters for injection
const Inject = (token: any) =>
  Parameter({
    data: { [INJECT_KEY]: token },
  });

class DatabaseService {}

class User {
  @Serializable()
  id: string;

  @Serializable()
  email: string;

  // This property will not be serialized
  passwordHash: string;

  constructor(@Inject(DatabaseService) db: DatabaseService) {
    // ...
  }
}

// Inspecting the metadata
const userMetadata = reflectionRegistry.getMetadata(User);

// Find all serializable properties
const serializableProperties = [...userMetadata.properties.values()].filter((prop) => prop.data.get(SERIALIZABLE_KEY) === true).map((prop) => prop.key);

console.log(serializableProperties); // ['id', 'email']

// Find injection tokens for constructor
const constructorParams = userMetadata.parameters;
const injectionToken = constructorParams[0].data.get(INJECT_KEY);

console.log(injectionToken === DatabaseService); // true
```

### Creating a Method Decorator

Method decorators can wrap the original method to add functionality like logging, timing, or caching.

```typescript
import { Method } from '@tstdl/decorators';

function LogCall() {
  Method({
    handler: (data, metadata, [target, propertyKey, descriptor]) => {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        console.log(`Calling ${String(data.methodKey)} with arguments:`, args);
        const result = originalMethod.apply(this, args);
        console.log(`Method ${String(data.methodKey)} returned:`, result);
        return result;
      };
    },
  });
}

class Calculator {
  @LogCall()
  add(a: number, b: number): number {
    return a + b;
  }
}

new Calculator().add(5, 10);
// Logs:
// > Calling add with arguments: [5, 10]
// > Method add returned: 15
```

### Creating a Universal Decorator

Use `Decorate()` to create a decorator that can be used on multiple target types.

```typescript
import { Decorate } from '@tstdl/decorators';

const Deprecated = (reason: string) =>
  Decorate({
    data: { deprecated: reason },
    class: true,
    method: true,
    property: true,
  });

@Deprecated('Use ProductServiceV2 instead')
class ProductService {
  @Deprecated('Use productName instead')
  name: string;

  @Deprecated('Use calculatePriceV2 instead')
  calculatePrice() {
    /* ... */
  }
}
```

### Wrapping Existing Decorators

If you are using decorators from a third-party library, you can wrap them to integrate them with the reflection system without modifying their source code.

```typescript
import { wrapDecorator } from '@tstdl/decorators';

// Imagine this is a decorator from another library
function ThirdPartyDecorator(value: string) {
  return function (target: any, propertyKey: string) {
    // ... its own logic
  };
}

// Wrap it to add your own metadata
const MyWrappedDecorator = (value: string) =>
  wrapDecorator(ThirdPartyDecorator(value), {
    data: { myData: value },
    handler: (data, metadata) => {
      console.log(`Wrapped decorator applied to ${String(data.propertyKey)}`);
    },
  });

class Pet {
  @MyWrappedDecorator('Fido')
  name: string;
}
```

## API Summary

| Function/Object          | Arguments                                                                                             | Returns                                              | Description                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `Decorate()`             | `options?: CreateDecoratorOptions & { handler?: DecoratorHandler }`                                   | `Decorator`                                          | Creates a universal decorator that can be applied to any target.     |
| `Class()`                | `options?: SpecificCreateDecoratorOptions<'class'>`                                                   | `ClassDecorator`                                     | Creates a decorator specifically for classes.                        |
| `Property()`             | `options?: SpecificCreateDecoratorOptions<'property'>`                                                | `PropertyDecorator`                                  | Creates a decorator specifically for properties.                     |
| `Accessor()`             | `options?: SpecificCreateDecoratorOptions<'accessor'>`                                                | `MethodDecorator`                                    | Creates a decorator specifically for accessors (get/set).            |
| `PropertyOrAccessor()`   | `options?: SpecificCreateDecoratorOptions<'property' \| 'accessor'>`                                  | `Decorator<'property'\|'accessor'>`                  | Creates a decorator for properties or accessors.                     |
| `Method()`               | `options?: SpecificCreateDecoratorOptions<'method'>`                                                  | `MethodDecorator`                                    | Creates a decorator specifically for methods.                        |
| `Parameter()`            | `options?: SpecificCreateDecoratorOptions<'parameter'>`                                               | `ParameterDecorator & ConstructorParameterDecorator` | Creates a decorator for method or constructor parameters.            |
| `MethodParameter()`      | `options?: SpecificCreateDecoratorOptions<'methodParameter'>`                                         | `ParameterDecorator`                                 | Creates a decorator specifically for method parameters.              |
| `ConstructorParameter()` | `options?: SpecificCreateDecoratorOptions<'constructorParameter'>`                                    | `ConstructorParameterDecorator`                      | Creates a decorator specifically for constructor parameters.         |
| `reflectionRegistry`     | _(object)_                                                                                            | `ReflectionRegistry`                                 | A global singleton instance of `ReflectionRegistry`.                 |
| `getDecoratorData()`     | `target: object`, `propertyKey?: string`, `descriptorOrParameterIndex?: PropertyDescriptor \| number` | `DecoratorData`                                      | Parses decorator arguments into a structured `DecoratorData` object. |
| `wrapDecorator()`        | `decorator: DecoratorUnion`, `options?: WrapDecoratorOptions`                                         | `DecoratorUnion`                                     | Wraps an existing decorator to add metadata or custom logic.         |
