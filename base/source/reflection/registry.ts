/* eslint-disable max-classes-per-file */
import { WeakRefMap } from '#/data-structures';
import type { Constructor, Type, Writable } from '#/types';
import { FactoryMap } from '#/utils/factory-map';
import { lazyObject, lazyObjectValue } from '#/utils/object/lazy-property';
import { getDesignType, getParameterTypes, getReturnType } from '#/utils/reflection';
import { isUndefined } from '#/utils/type-guards';
import { getDecoratorData } from './decorator-data';
import type { DecoratorData } from './types';

type Data = Map<string | symbol, any>;

export type ReflectionMetadata = TypeMetadata | PropertyMetadata | MethodMetadata | ConstructorParameterMetadata | MethodParameterMetadata;

export type MetadataType = 'type' | 'property' | 'method' | 'method-parameter' | 'constructor-parameter';

export type MetadataBase<T extends MetadataType> = {
  metadataType: T
};

export type TypeMetadata = MetadataBase<'type'> & {
  readonly constructor: Constructor,

  /** may be undefined if class has no constructor */
  readonly parameters: ConstructorParameterMetadata[] | undefined,
  readonly properties: Map<string | symbol, PropertyMetadata>,
  readonly staticProperties: Map<string | symbol, PropertyMetadata>,
  readonly methods: Map<string | symbol, MethodMetadata>,
  readonly staticMethods: Map<string | symbol, MethodMetadata>,
  readonly data: Data,
  readonly registered: boolean
};

type WritableTypeMetadata = Writable<TypeMetadata>;

export type PropertyMetadata = MetadataBase<'property'> & {
  key: string | symbol,
  type: Type,
  isAccessor: boolean,
  data: Data
};

export type MethodMetadata = MetadataBase<'method'> & {
  parameters: MethodParameterMetadata[],
  returnType: Type | undefined,
  data: Data
};

export type ConstructorParameterMetadata = MetadataBase<'constructor-parameter'> & {
  type: Type | undefined,
  index: number,
  data: Data
};

export type MethodParameterMetadata = MetadataBase<'method-parameter'> & {
  type: Type,
  index: number,
  data: Data
};

export type ParameterMetadata = ConstructorParameterMetadata | MethodParameterMetadata;

export class ReflectionRegistry {
  private readonly metadataMap: FactoryMap<Type, TypeMetadata>;

  constructor() {
    this.metadataMap = new FactoryMap((type) => this.initializeType(type), new WeakRefMap());
  }

  hasType(type: Constructor): boolean {
    return this.metadataMap.has(type) && this.getMetadata(type).registered;
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

    (metadata as WritableTypeMetadata).registered = true;

    if (data.type == 'class') {
      return metadata;
    }
    else if ((data.type == 'property') || (data.type == 'accessor')) {
      const propertyMetadata = (data.static ? metadata.staticProperties : metadata.properties).get(data.propertyKey)!;
      propertyMetadata.isAccessor = data.type == 'accessor';

      return propertyMetadata;
    }
    else if (data.type == 'method') {
      return (data.static ? metadata.staticMethods : metadata.methods).get(data.methodKey)!;
    }
    else if (data.type == 'parameter') {
      return (data.static ? metadata.staticMethods : metadata.methods).get(data.methodKey)!;
    }
    else if (data.type == 'constructor-parameter') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      if (isUndefined(metadata.parameters)) {
        throw new Error('Constructor parameters are not available. (missing decoration?)');
      }

      return metadata.parameters[data.index]!;
    }

    throw new Error(`Unknown DecoratorData type ${(data as DecoratorData).type}`);
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
      metadataType: 'type',
      constructor: lazyObjectValue(type),
      parameters: {
        initializer() {
          const parametersTypes = getParameterTypes(type);
          return parametersTypes?.map((parameterType, index): ConstructorParameterMetadata => ({ metadataType: 'constructor-parameter', index, type: parameterType, data: new Map() }));
        }
      },
      properties: {
        initializer: () => new FactoryMap((key): PropertyMetadata => ({ metadataType: 'property', key, type: getDesignType(type.prototype as object, key), isAccessor: false, data: new Map() }))
      },
      staticProperties: {
        initializer: () => new FactoryMap((key): PropertyMetadata => ({ metadataType: 'property', key, type: getDesignType(type, key), isAccessor: false, data: new Map() }))
      },
      methods: {
        initializer: () => new FactoryMap((key): MethodMetadata => {
          const parameters = getParameterTypes(type.prototype as object, key);
          const returnType = getReturnType(type.prototype as object, key);

          if (isUndefined(parameters)) {
            throw new Error(`Could not get parameters for method ${key.toString()} of type ${type.name}`);
          }

          return { metadataType: 'method', parameters: parameters.map((parameter, index): MethodParameterMetadata => ({ metadataType: 'method-parameter', index, type: parameter, data: new Map() })), returnType, data: new Map() };
        })
      },
      staticMethods: {
        initializer: () => new FactoryMap((key): MethodMetadata => {
          const parameters = getParameterTypes(type as object, key);
          const returnType = getReturnType(type as object, key);

          if (isUndefined(parameters)) {
            throw new Error(`Could not get parameters for static method ${key.toString()} of type ${type.name}`);
          }

          return { metadataType: 'method', parameters: parameters.map((parameter, index): MethodParameterMetadata => ({ metadataType: 'method-parameter', index, type: parameter, data: new Map() })), returnType, data: new Map() };
        })
      },
      data: { initializer: () => new Map() },
      registered: false
    });
  }
}

export const reflectionRegistry = new ReflectionRegistry();
