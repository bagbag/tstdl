/* eslint-disable max-classes-per-file */
import { WeakRefMap } from '#/data-structures';
import type { Constructor, Type } from '#/types';
import { FactoryMap } from '#/utils/factory-map';
import { lazyObject, lazyObjectValue } from '#/utils/object';
import { getDesignType, getParameterTypes, getReturnType } from '#/utils/reflection';
import { assertDefined, isUndefined } from '#/utils/type-guards';
import type { DecoratorData } from './decorator-data';
import { getDecoratorData } from './decorator-data';

type Data = Map<string | symbol, any>;

export type ReflectionMetadata = TypeMetadata | PropertyMetadata | MethodMetadata | ParameterMetadata;

export type TypeMetadata = {
  constructor: Constructor,
  parameters: ParameterMetadata[],
  properties: Map<string | symbol, PropertyMetadata>,
  staticProperties: Map<string | symbol, PropertyMetadata>,
  methods: Map<string | symbol, MethodMetadata>,
  staticMethods: Map<string | symbol, MethodMetadata>,
  data: Data
};

export type PropertyMetadata = {
  type: Type,
  data: Data
};

export type MethodMetadata = {
  parameters: ParameterMetadata[],
  returnType: Type | undefined,
  data: Data
};

export type ParameterMetadata = {
  type: Type,
  data: Data
};

export class ReflectionRegistry {
  private readonly metadataMap: FactoryMap<Type, TypeMetadata>;

  constructor() {
    this.metadataMap = new FactoryMap((type) => this.initializeType(type), new WeakRefMap());
  }

  getMetadata(type: Constructor): TypeMetadata {
    return this.metadataMap.get(type);
  }

  register(target: object, propertyKey?: string | symbol, descriptorOrParameterIndex?: PropertyDescriptor | number): DecoratorData {
    const data = getDecoratorData(target, propertyKey, descriptorOrParameterIndex);
    this.registerDecoratorData(data);

    return data;
  }

  registerDecoratorData(data: DecoratorData): ReflectionMetadata {
    const metadata = this.metadataMap.get(data.constructor);

    if (data.type == 'class') {
      return metadata;
    }
    else if ((data.type == 'property') || (data.type == 'accessor')) {
      return (data.static ? metadata.staticProperties : metadata.properties).get(data.propertyKey)!;
    }
    else if (data.type == 'method') {
      return (data.static ? metadata.staticMethods : metadata.methods).get(data.methodKey)!;
    }
    else if (data.type == 'parameter') {
      return (data.static ? metadata.staticMethods : metadata.methods).get(data.methodKey)!;
    }
    else if (data.type == 'constructor-parameter') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      return metadata.parameters[data.index]!;
    }
    else {
      throw new Error(`Unknown DecoratorData type ${(data as DecoratorData).type}`);
    }
  }

  /**
   * Unregister a type. Can be useful if you replace a class with an decorator.
   * However, this should not be necessary since WeakRefs are used.
   * @param type Type to unregister
   */
  unregister(type: Type): void {
    this.metadataMap.delete(type);
  }

  // eslint-disable-next-line max-lines-per-function
  private initializeType(type: Type): TypeMetadata {
    return lazyObject<TypeMetadata>({
      constructor: lazyObjectValue(type),
      parameters: {
        initializer() {
          const parameters = getParameterTypes(type);
          assertDefined(parameters, 'missing constructor parameters');

          return parameters.map((parameter): ParameterMetadata => ({ type: parameter, data: new Map() }));
        }
      },
      properties: {
        initializer: () => new FactoryMap((key): PropertyMetadata => ({ type: getDesignType(type.prototype as object, key), data: new Map() }))
      },
      staticProperties: {
        initializer: () => new FactoryMap((key): PropertyMetadata => ({ type: getDesignType(type, key), data: new Map() }))
      },
      methods: {
        initializer: () => new FactoryMap((key): MethodMetadata => {
          const parameters = getParameterTypes(type.prototype as object, key);
          const returnType = getReturnType(type.prototype as object, key);

          if (isUndefined(parameters)) {
            throw new Error(`Could not get parameters for method ${key.toString()} of type ${type.name}`);
          }

          return { parameters: parameters.map((parameter): ParameterMetadata => ({ type: parameter, data: new Map() })), returnType, data: new Map() };
        })
      },
      staticMethods: {
        initializer: () => new FactoryMap((key): MethodMetadata => {
          const parameters = getParameterTypes(type as object, key);
          const returnType = getReturnType(type as object, key);

          if (isUndefined(parameters)) {
            throw new Error(`Could not get parameters for static method ${key.toString()} of type ${type.name}`);
          }

          return { parameters: parameters.map((parameter): ParameterMetadata => ({ type: parameter, data: new Map() })), returnType, data: new Map() };
        })
      },
      data: { initializer: () => new Map() }
    });
  }
}

export const reflectionRegistry = new ReflectionRegistry();
