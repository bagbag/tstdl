import type { Constructor, PropertiesOfType, Record } from '#/types';
import { noop } from '#/utils/noop';
import { objectEntries } from '#/utils/object/object';
import { assert, assertArray, assertMap, assertObject, assertSet, isArray, isDefined, isFunction, isMap, isObject, isSet, isSymbol } from '#/utils/type-guards';
import { getDecoratorData } from './decorator-data';
import { reflectionRegistry } from './registry';
import type { Decorator, DecoratorData, DecoratorHandler, DecoratorMetadata, DecoratorType } from './types';

export type CreateDecoratorTypeOptions = { [P in DecoratorType]?: boolean };

export type CreateDecoratorOptions = {
  data?: Record<string | symbol>,

  /** merge data values instead of replacing them (requires them to be objects, arrays, maps or sets) */
  mergeData?: boolean
};

export type SpecificCreateDecoratorOptions<T extends DecoratorType> = CreateDecoratorOptions & {
  handler?: DecoratorHandler<T>
};

type CreateDecoratorType<T extends CreateDecoratorOptions> = Extract<PropertiesOfType<T, true>, DecoratorType>;

// eslint-disable-next-line max-lines-per-function
export function createDecorator<T extends CreateDecoratorTypeOptions & CreateDecoratorOptions>(options: T, handler: DecoratorHandler<CreateDecoratorType<T>> = noop): Decorator<CreateDecoratorType<T>> {
  // eslint-disable-next-line max-statements, max-lines-per-function
  function decoratorWrapper(target: object, propertyKey?: string | symbol, descriptorOrParameterIndex?: PropertyDescriptor | number): ReturnType<Decorator> {
    const data = getDecoratorData(target, propertyKey, descriptorOrParameterIndex);
    const optionsType: keyof CreateDecoratorTypeOptions = (data.type == 'constructor-parameter') ? 'constructorParameter' : data.type;

    const valid = (options[optionsType] == true)
      || (optionsType == 'parameter' && ((options.constructorParameter == true) || (options.methodParameter == true)))
      || (((optionsType == 'constructorParameter') || (optionsType as DecoratorType == 'methodParameter')) && (options.parameter == true));

    assert(valid, () => `Decorator cannot be used for ${data.type}.`);

    const metadata = reflectionRegistry.registerDecoratorData(data) as DecoratorMetadata<CreateDecoratorType<T>>;

    if (isDefined(options.data)) {
      for (const [key, value] of objectEntries(options.data)) {
        if (options.mergeData != true) {
          metadata.data.set(key, value);
        }
        else {
          let newData: any;

          if (isObject(value)) {
            const existing = metadata.data.get(key) ?? {};
            assertObject(existing, 'Cannot merge object into non-object.');
            newData = { ...existing, ...value };
          }
          else if (isArray(value)) {
            const existing = metadata.data.get(key) ?? [];
            assertArray(existing, 'Cannot merge array into non-array.');
            newData = [...existing, ...value];
          }
          else if (isMap(value)) {
            const existing = metadata.data.get(key) ?? new Map();
            assertMap(existing, 'Cannot merge map into non-map.');
            newData = new Map([...existing, ...value]);
          }
          else if (isSet(value)) {
            const existing = metadata.data.get(key) ?? new Set();
            assertSet(existing, 'Cannot merge set into non-set.');
            newData = new Set([...existing, ...value]);
          }
          else {
            throw new Error('Merging of data can only be done with objects, arrays, maps and sets.');
          }

          metadata.data.set(key, newData);
        }
      }
    }

    return handler(data as DecoratorData<CreateDecoratorType<T>>, metadata) as void;
  }

  return decoratorWrapper as Decorator<CreateDecoratorType<T>>;
}

export function createClassDecorator(options: SpecificCreateDecoratorOptions<'class'> = {}): ClassDecorator {
  return createDecorator({ ...options, class: true }, options.handler);
}

export function createPropertyDecorator(options: SpecificCreateDecoratorOptions<'property'> = {}): PropertyDecorator {
  return createDecorator({ ...options, property: true }, options.handler);
}

export function createAccessorDecorator(options: SpecificCreateDecoratorOptions<'accessor'> = {}): MethodDecorator {
  return createDecorator({ ...options, accessor: true }, options.handler);
}

export function createPropertyOrAccessorDecorator(options: SpecificCreateDecoratorOptions<'property' | 'accessor'> = {}): Decorator<'property' | 'accessor'> {
  return createDecorator({ ...options, property: true, accessor: true }, options.handler);
}

export function createMethodDecorator(options: SpecificCreateDecoratorOptions<'method'> = {}): MethodDecorator {
  return createDecorator({ ...options, method: true }, options.handler);
}

export function createParameterDecorator(options: SpecificCreateDecoratorOptions<'parameter'> = {}): ParameterDecorator {
  return createDecorator({ ...options, parameter: true }, options.handler);
}

export function createMethodParameterDecorator(options: SpecificCreateDecoratorOptions<'methodParameter'> = {}): ParameterDecorator {
  return createDecorator({ ...options, methodParameter: true }, options.handler);
}

export function createConstructorParameterDecorator(options: SpecificCreateDecoratorOptions<'constructorParameter'> = {}): ParameterDecorator {
  return createDecorator({ ...options, constructorParameter: true }, options.handler);
}

export function getConstructor<T extends Constructor = Constructor>(constructorOrTarget: object): T {
  return isFunction<T>(constructorOrTarget)
    ? constructorOrTarget
    : (constructorOrTarget.constructor as T);
}

export function getTypeInfoString(type: Constructor): string {
  const lines: string[] = [];

  const metadata = reflectionRegistry.getMetadata(type);
  const constructorParameters = metadata.parameters?.map((parameter) => parameter.type?.name ?? '<unknown>').join(', ') ?? '?';

  lines.push(`${metadata.constructor.name}(${constructorParameters})`);

  for (const [key, propertyMetadata] of metadata.staticProperties) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    lines.push(`  static ${propertyKey}: ${propertyMetadata.type.name}`);
  }

  for (const [key, methodMetadata] of metadata.staticMethods) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    const parameters = methodMetadata.parameters.map((parameter) => parameter.type.name).join(', ');
    lines.push(`  static ${propertyKey}(${parameters}): ${methodMetadata.returnType?.name ?? 'void'}`);
  }

  for (const [key, propertyMetadata] of metadata.properties) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    lines.push(`  ${propertyKey}: ${propertyMetadata.type.name}`);
  }

  for (const [key, methodMetadata] of metadata.methods) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    const parameters = methodMetadata.parameters.map((parameter) => parameter.type.name).join(', ');
    lines.push(`  ${propertyKey}(${parameters}): ${methodMetadata.returnType?.name ?? 'void'}`);
  }

  return lines.join('\n');
}

// eslint-disable-next-line max-statements, max-lines-per-function
export function printType(type: Constructor): void {
  const text = getTypeInfoString(type);
  console.log(text);
}