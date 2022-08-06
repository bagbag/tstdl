import type { Constructor, OneOrMany, PropertiesOfType, Record, TypedOmit } from '#/types';
import { toArray } from '#/utils/array/array';
import { noop } from '#/utils/noop';
import { assert, isDefined, isFunction, isSymbol } from '#/utils/type-guards';
import { getDecoratorData } from './decorator-data';
import { reflectionRegistry } from './registry';
import type { Decorator, DecoratorData, DecoratorHandler, DecoratorMetadata, DecoratorType, DecoratorUnion } from './types';

export type CreateDecoratorTypeOptions = { [P in DecoratorType]?: boolean };

export type CreateDecoratorOptions = {
  data?: Record<string | symbol>,

  /** merge data values instead of replacing them (requires them to be objects, arrays, maps or sets) */
  mergeData?: boolean,

  /** return values of these decorators are not used */
  include?: OneOrMany<DecoratorUnion>
};

export type SpecificCreateDecoratorOptions<T extends DecoratorType> = TypedOmit<CreateDecoratorOptions, 'include'> & {
  handler?: DecoratorHandler<T>,
  include?: OneOrMany<DecoratorUnion<T>>
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
      metadata.data.setMany(options.data, options.mergeData);
    }

    const result = handler(data as DecoratorData<CreateDecoratorType<T>>, metadata) as void;

    if (isDefined(options.include)) {
      for (const include of toArray(options.include)) {
        (include as (...args: any[]) => any)(target, propertyKey as any, descriptorOrParameterIndex as any); // eslint-disable-line @typescript-eslint/no-unsafe-argument
      }
    }

    return result;
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

export function printType(type: Constructor): void {
  const text = getTypeInfoString(type);
  console.log(text); // eslint-disable-line no-console
}
