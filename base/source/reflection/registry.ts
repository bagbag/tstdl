/* eslint-disable max-classes-per-file */
import type { AbstractConstructor, Writable } from '#/types.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { lazyObject, lazyObjectValue } from '#/utils/object/lazy-property.js';
import { getDesignType, getParameterTypes, getReturnType } from '#/utils/reflection.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { getDecoratorData } from './decorator-data.js';
import { ReflectionDataMap } from './reflection-data-map.js';
import type { DecoratorData } from './types.js';

export type ReflectionMetadata = TypeMetadata | PropertyMetadata | MethodMetadata | ConstructorParameterMetadata | MethodParameterMetadata;

export type MetadataType = 'type' | 'property' | 'method' | 'method-parameter' | 'constructor-parameter';

export type MetadataBase<T extends MetadataType> = {
  metadataType: T
};

export type TypeMetadata = MetadataBase<'type'> & {
  readonly constructor: AbstractConstructor,
  readonly parent: AbstractConstructor | null,

  /** Undefined if class has no constructor */
  readonly parameters: ConstructorParameterMetadata[] | undefined,

  readonly properties: ReadonlyMap<string | symbol, PropertyMetadata>,
  readonly staticProperties: ReadonlyMap<string | symbol, PropertyMetadata>,
  readonly methods: ReadonlyMap<string | symbol, MethodMetadata>,
  readonly staticMethods: ReadonlyMap<string | symbol, MethodMetadata>,

  readonly data: ReflectionDataMap
};

export type PropertyMetadata = MetadataBase<'property'> & {
  key: string | symbol,
  type: AbstractConstructor,
  isAccessor: boolean,
  data: ReflectionDataMap
};

export type MethodMetadata = MetadataBase<'method'> & {
  parameters: MethodParameterMetadata[],
  returnType: AbstractConstructor | undefined,
  data: ReflectionDataMap
};

export type ConstructorParameterMetadata = MetadataBase<'constructor-parameter'> & {
  type: AbstractConstructor | undefined,
  index: number,
  data: ReflectionDataMap
};

export type MethodParameterMetadata = MetadataBase<'method-parameter'> & {
  type: AbstractConstructor,
  index: number,
  data: ReflectionDataMap
};

export type ParameterMetadata = ConstructorParameterMetadata | MethodParameterMetadata;

export class ReflectionRegistry {
  private readonly metadataMap: WeakMap<AbstractConstructor, TypeMetadata>;
  private readonly finalizedTypesSet: WeakSet<AbstractConstructor>;

  constructor() {
    this.metadataMap = new WeakMap();
    this.finalizedTypesSet = new WeakSet();
  }

  hasType(type: AbstractConstructor): boolean {
    return this.metadataMap.has(type);
  }

  getMetadata(type: AbstractConstructor): TypeMetadata | undefined {
    const metadata = this.metadataMap.get(type);

    if (isDefined(metadata) && !this.finalizedTypesSet.has(type)) {
      (metadata as Writable<TypeMetadata>).properties = new Map(metadata.properties);
      (metadata as Writable<TypeMetadata>).staticProperties = new Map(metadata.staticProperties);
      (metadata as Writable<TypeMetadata>).methods = new Map(metadata.methods);
      (metadata as Writable<TypeMetadata>).staticMethods = new Map(metadata.staticMethods);

      this.finalizedTypesSet.add(type);
    }

    return metadata;
  }

  register(target: object, propertyKey?: string | symbol, descriptorOrParameterIndex?: PropertyDescriptor | number): DecoratorData {
    const data = getDecoratorData(target, propertyKey, descriptorOrParameterIndex);
    this.registerDecoratorData(data);

    return data;
  }

  registerDecoratorData(data: DecoratorData): ReflectionMetadata {
    const metadata = this.getOrInitializeMetadata(data.constructor);

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
    else if (data.type == 'method-parameter') {
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
  unregister(type: AbstractConstructor): void {
    this.metadataMap.delete(type);
  }

  getOrInitializeMetadata(type: AbstractConstructor): TypeMetadata {
    if (this.finalizedTypesSet.has(type)) {
      throw new Error('Reflection data was accessed before registration was done.');
    }

    if (!this.metadataMap.has(type)) {
      const metadata = initializeType(type);
      this.metadataMap.set(type, metadata);
      return metadata;
    }

    return this.metadataMap.get(type)!;
  }
}

function initializeType(type: AbstractConstructor): TypeMetadata {
  return lazyObject<TypeMetadata>({
    metadataType: 'type',
    constructor: lazyObjectValue(type),
    parent: lazyObjectValue(Reflect.getPrototypeOf(type) as AbstractConstructor | null),
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
    data: { initializer: () => new ReflectionDataMap() }
  });
}

export const reflectionRegistry = new ReflectionRegistry();
