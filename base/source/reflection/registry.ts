/* eslint-disable max-classes-per-file */
import type { AbstractConstructor, AbstractType, Constructor, Writable } from '#/types';
import { FactoryMap } from '#/utils/factory-map';
import { lazyObject, lazyObjectValue } from '#/utils/object/lazy-property';
import { getDesignType, getParameterTypes, getReturnType } from '#/utils/reflection';
import { isUndefined } from '#/utils/type-guards';
import { getDecoratorData } from './decorator-data';
import { ReflectionDataMap } from './reflection-data-map';
import type { DecoratorData } from './types';

export type ReflectionMetadata = TypeMetadata | PropertyMetadata | MethodMetadata | ConstructorParameterMetadata | MethodParameterMetadata;

export type MetadataType = 'type' | 'property' | 'method' | 'method-parameter' | 'constructor-parameter';

export type MetadataBase<T extends MetadataType> = {
  metadataType: T
};

export type TypeMetadata = MetadataBase<'type'> & {
  readonly constructor: AbstractConstructor,

  /** may be undefined if class has no constructor */
  readonly parameters: ConstructorParameterMetadata[] | undefined,
  readonly properties: Map<string | symbol, PropertyMetadata>,
  readonly staticProperties: Map<string | symbol, PropertyMetadata>,
  readonly methods: Map<string | symbol, MethodMetadata>,
  readonly staticMethods: Map<string | symbol, MethodMetadata>,
  readonly data: ReflectionDataMap,

  /** whether the type is known in reflection registry and contains metadata */
  readonly registered: boolean
};

type WritableTypeMetadata = Writable<TypeMetadata>;

export type PropertyMetadata = MetadataBase<'property'> & {
  key: string | symbol,
  type: AbstractType,
  isAccessor: boolean,
  data: ReflectionDataMap
};

export type MethodMetadata = MetadataBase<'method'> & {
  parameters: MethodParameterMetadata[],
  returnType: AbstractType | undefined,
  data: ReflectionDataMap
};

export type ConstructorParameterMetadata = MetadataBase<'constructor-parameter'> & {
  type: AbstractType | undefined,
  index: number,
  data: ReflectionDataMap
};

export type MethodParameterMetadata = MetadataBase<'method-parameter'> & {
  type: AbstractType,
  index: number,
  data: ReflectionDataMap
};

export type ParameterMetadata = ConstructorParameterMetadata | MethodParameterMetadata;

export class ReflectionRegistry {
  private readonly metadataMap: WeakMap<AbstractConstructor, TypeMetadata>;

  constructor() {
    this.metadataMap = new WeakMap();
  }

  hasType(type: Constructor): boolean {
    return this.metadataMap.has(type) && this.getMetadata(type).registered;
  }

  getMetadata(type: AbstractType): TypeMetadata {
    if (!this.metadataMap.has(type)) {
      const metadata = this.initializeType(type);
      this.metadataMap.set(type, metadata);
      return metadata;
    }

    return this.metadataMap.get(type)!;
  }

  register(target: object, propertyKey?: string | symbol, descriptorOrParameterIndex?: PropertyDescriptor | number): DecoratorData {
    const data = getDecoratorData(target, propertyKey, descriptorOrParameterIndex);
    this.registerDecoratorData(data);

    return data;
  }

  registerDecoratorData(data: DecoratorData): ReflectionMetadata {
    const metadata = this.getMetadata(data.constructor);

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
  unregister(type: AbstractType): void {
    this.metadataMap.delete(type);
  }

  // eslint-disable-next-line max-lines-per-function
  private initializeType(type: AbstractType): TypeMetadata {
    return lazyObject<TypeMetadata>({
      metadataType: 'type',
      constructor: lazyObjectValue(type),
      parameters: {
        initializer() {
          const parametersTypes = getParameterTypes(type);
          return parametersTypes?.map((parameterType, index): ConstructorParameterMetadata => ({ metadataType: 'constructor-parameter', index, type: parameterType, data: new ReflectionDataMap() }));
        }
      },
      properties: {
        initializer: () => new FactoryMap((key): PropertyMetadata => ({ metadataType: 'property', key, type: getDesignType(type.prototype as object, key), isAccessor: false, data: new ReflectionDataMap() }))
      },
      staticProperties: {
        initializer: () => new FactoryMap((key): PropertyMetadata => ({ metadataType: 'property', key, type: getDesignType(type, key), isAccessor: false, data: new ReflectionDataMap() }))
      },
      methods: {
        initializer: () => new FactoryMap((key): MethodMetadata => {
          const parameters = getParameterTypes(type.prototype as object, key);
          const returnType = getReturnType(type.prototype as object, key);

          if (isUndefined(parameters)) {
            throw new Error(`Could not get parameters for method ${key.toString()} of type ${type.name}`);
          }

          return { metadataType: 'method', parameters: parameters.map((parameter, index): MethodParameterMetadata => ({ metadataType: 'method-parameter', index, type: parameter, data: new ReflectionDataMap() })), returnType, data: new ReflectionDataMap() };
        })
      },
      staticMethods: {
        initializer: () => new FactoryMap((key): MethodMetadata => {
          const parameters = getParameterTypes(type as object, key);
          const returnType = getReturnType(type as object, key);

          if (isUndefined(parameters)) {
            throw new Error(`Could not get parameters for static method ${key.toString()} of type ${type.name}`);
          }

          return { metadataType: 'method', parameters: parameters.map((parameter, index): MethodParameterMetadata => ({ metadataType: 'method-parameter', index, type: parameter, data: new ReflectionDataMap() })), returnType, data: new ReflectionDataMap() };
        })
      },
      data: { initializer: () => new ReflectionDataMap() },
      registered: false
    });
  }
}

export const reflectionRegistry = new ReflectionRegistry();
