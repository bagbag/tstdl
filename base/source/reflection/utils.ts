import type { Constructor, Record } from '#/types';
import { assert, isDefined, isFunction, isSymbol } from '#/utils/type-guards';
import type { AccessorDecoratorData, ClassDecoratorData, ConstructorParameterDecoratorData, DecoratorData, MethodDecoratorData, MethodParameterDecoratorData, ParameterDecoratorData, PropertyDecoratorData, PropertyOrAccessorDecoratorData } from './decorator-data';
import { getDecoratorData } from './decorator-data';
import { reflectionRegistry } from './registry';

export type Decorator = ClassDecorator | PropertyDecorator | MethodDecorator | ParameterDecorator;
export type DecoratorHandler = (data: DecoratorData) => ReturnType<Decorator>;
export type ClassDecoratorHandler<T extends Constructor> = (data: ClassDecoratorData) => void | undefined | T;
export type PropertyDecoratorHandler = (data: PropertyDecoratorData) => void;
export type AccessorDecoratorHandler = (data: AccessorDecoratorData) => void;
export type PropertyOrAccessorDecoratorHandler = <T>(data: PropertyOrAccessorDecoratorData) => void | TypedPropertyDescriptor<T>;
export type MethodDecoratorHandler = <T>(data: MethodDecoratorData) => void | TypedPropertyDescriptor<T>;
export type ParameterDecoratorHandler = (data: ParameterDecoratorData) => void;
export type ConstructorParameterDecoratorHandler = (data: ConstructorParameterDecoratorData) => void;
export type MethodParameterDecoratorHandler = (data: MethodParameterDecoratorData) => void;

export type CreateDecoratorOptions = {
  data?: Record<string | symbol>
};

export function createDecorator(decorator: DecoratorHandler, options: CreateDecoratorOptions = {}): Decorator {
  function decoratorWrapper(target: object, propertyKey?: string | symbol, descriptorOrParameterIndex?: PropertyDescriptor | number): ReturnType<Decorator> {
    const data = getDecoratorData(target, propertyKey, descriptorOrParameterIndex);
    const metadata = reflectionRegistry.registerDecoratorData(data);

    if (isDefined(options.data)) {
      for (const [key, value] of Object.entries(options.data)) {
        metadata.data.set(key, value);
      }
    }

    return decorator(data);
  }

  return decoratorWrapper;
}

export function createClassDecorator<T extends Constructor>(decorator: ClassDecoratorHandler<T>, options: CreateDecoratorOptions = {}): ClassDecorator {
  return createDecorator((data) => {
    assert(data.type == 'class', `Class decorator cannot be used for ${data.type}.`);
    return decorator(data);
  }, options) as ClassDecorator;
}

export function createPropertyDecorator(decorator: PropertyDecoratorHandler, options: CreateDecoratorOptions = {}): PropertyDecorator {
  return createDecorator((data) => {
    assert(data.type == 'property', `Property decorator cannot be used for ${data.type}.`);
    decorator(data);
  }, options) as PropertyDecorator;
}

export function createAccessorDecorator(decorator: AccessorDecoratorHandler, options: CreateDecoratorOptions = {}): MethodDecorator {
  return createDecorator((data) => {
    assert(data.type == 'accessor', `Accessor decorator cannot be used for ${data.type}.`);
    decorator(data);
  }, options) as MethodDecorator;
}

export function createPropertyOrAccessorDecorator(decorator: PropertyOrAccessorDecoratorHandler, options: CreateDecoratorOptions = {}): MethodDecorator {
  return createDecorator((data) => {
    assert((data.type == 'property') || (data.type == 'accessor'), `Property or accessor decorator cannot be used for ${data.type}.`);
    decorator(data);
  }, options) as MethodDecorator;
}

export function createMethodDecorator(decorator: MethodDecoratorHandler, options: CreateDecoratorOptions = {}): MethodDecorator {
  return createDecorator((data) => {
    assert(data.type == 'method', `Method decorator cannot be used for ${data.type}.`);
    return decorator(data);
  }, options) as MethodDecorator;
}

export function createParameterDecorator(decorator: ParameterDecoratorHandler, options: CreateDecoratorOptions = {}): ParameterDecorator {
  return createDecorator((data) => {
    assert((data.type == 'parameter') || (data.type == 'constructor-parameter'), `Parameter decorator cannot be used for ${data.type}.`);
    decorator(data);
  }, options) as ParameterDecorator;
}

export function createConstructorParameterDecorator(decorator: ConstructorParameterDecoratorHandler, options: CreateDecoratorOptions = {}): ParameterDecorator {
  return createDecorator((data) => {
    assert((data.type == 'constructor-parameter'), `Constructor-Parameter decorator cannot be used for ${data.type}.`);
    decorator(data);
  }, options) as ParameterDecorator;
}

export function createMethodParameterDecorator(decorator: MethodParameterDecoratorHandler, options: CreateDecoratorOptions = {}): ParameterDecorator {
  return createDecorator((data) => {
    assert((data.type == 'parameter'), `Method-Parameter decorator cannot be used for ${data.type}.`);
    decorator(data);
  }, options) as ParameterDecorator;
}

export function getConstructor<T extends Constructor = Constructor>(constructorOrTarget: object): T {
  return isFunction<T>(constructorOrTarget)
    ? constructorOrTarget
    : (constructorOrTarget.constructor as T);
}

export function getTypeInfoString(type: Constructor): string {
  const lines: string[] = [];

  const metadata = reflectionRegistry.getMetadata(type);
  const constructorParameters = metadata.parameters.map((parameter) => parameter.type.name).join(', ');

  lines.push(`${metadata.constructor.name}(${constructorParameters})`);

  for (const [key, propertyMetadata] of metadata.staticProperties) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    lines.push(`  static ${propertyKey}: ${propertyMetadata.type.name}`);
  }

  for (const [key, methodMetadata] of metadata.staticMethods) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    const parameters = metadata.parameters.map((parameter) => parameter.type.name).join(', ');
    lines.push(`  static ${propertyKey}(${parameters}): ${methodMetadata.returnType?.name ?? 'void'}`);
  }

  for (const [key, propertyMetadata] of metadata.properties) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    lines.push(`  ${propertyKey}: ${propertyMetadata.type.name}`);
  }

  for (const [key, methodMetadata] of metadata.methods) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    const parameters = metadata.parameters.map((parameter) => parameter.type.name).join(', ');
    lines.push(`  ${propertyKey}(${parameters}): ${methodMetadata.returnType?.name ?? 'void'}`);
  }

  return lines.join('\n');
}

// eslint-disable-next-line max-statements, max-lines-per-function
export function printType(type: Constructor): void {
  const text = getTypeInfoString(type);
  console.log(text);
}
