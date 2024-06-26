import type { AbstractConstructor, Constructor, ConstructorParameterDecorator, OneOrMany, PropertiesOfType, Record, TypedOmit } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { noop } from '#/utils/noop.js';
import { assert, isDefined, isFunction, isSymbol } from '#/utils/type-guards.js';
import { getDecoratorData } from './decorator-data.js';
import { reflectionRegistry } from './registry.js';
import type { CombinedDecoratorParameters, Decorator, DecoratorData, DecoratorHandler, DecoratorMetadata, DecoratorType, DecoratorUnion } from './types.js';

export type CreateDecoratorTypeOptions = { [P in DecoratorType]?: boolean };

export type CreateDecoratorOptions = {
  data?: Record<string | symbol>,

  /** Merge data values instead of replacing them (requires them to be objects, arrays, maps or sets) */
  mergeData?: boolean,

  /** Return values of these decorators are not used */
  include?: OneOrMany<DecoratorUnion>
};

export type SpecificCreateDecoratorOptions<T extends DecoratorType> = TypedOmit<CreateDecoratorOptions, 'include'> & {
  handler?: DecoratorHandler<T>,
  include?: OneOrMany<DecoratorUnion<T>>
};

export type WrapDecoratorOptions = CreateDecoratorOptions & {
  handler?: (data: DecoratorData, metadata: DecoratorMetadata, originalArguments: CombinedDecoratorParameters) => void
};

type CreateDecoratorType<T extends CreateDecoratorOptions> = Extract<PropertiesOfType<T, true>, DecoratorType>;

// eslint-disable-next-line max-lines-per-function
export function createDecorator<T extends CreateDecoratorTypeOptions & CreateDecoratorOptions>(options: T, handler: DecoratorHandler<CreateDecoratorType<T>> = noop): Decorator<CreateDecoratorType<T>> {
  // eslint-disable-next-line max-statements, max-lines-per-function
  function decoratorWrapper(...args: CombinedDecoratorParameters): ReturnType<Decorator> {
    const data = getDecoratorData(...args);
    const optionsType: keyof CreateDecoratorTypeOptions =
      (data.type == 'constructor-parameter') ? 'constructorParameter'
        : (data.type == 'method-parameter') ? 'methodParameter'
          : data.type;

    const valid = (options[optionsType] == true)
      || (optionsType == 'methodParameter' && ((options.methodParameter == true) || (options.parameter == true)))
      || (optionsType == 'constructorParameter' && ((options.constructorParameter == true) || (options.parameter == true)));

    assert(valid, () => `Decorator cannot be used for ${data.type}.`);

    const metadata = reflectionRegistry.registerDecoratorData(data) as DecoratorMetadata<CreateDecoratorType<T>>;

    if (isDefined(options.data)) {
      metadata.data.setMany(options.data, options.mergeData);
    }

    const result = handler(data as DecoratorData<CreateDecoratorType<T>>, metadata, args as Parameters<DecoratorHandler<CreateDecoratorType<T>>>['2']) as void;

    if (isDefined(options.include)) {
      for (const include of toArray(options.include)) {
        (include as (...includeArgs: any[]) => any)(...args); // eslint-disable-line @typescript-eslint/no-unsafe-argument
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

export function createMethodParameterDecorator(options: SpecificCreateDecoratorOptions<'methodParameter'> = {}): ParameterDecorator {
  return createDecorator({ ...options, methodParameter: true }, options.handler);
}

export function createConstructorParameterDecorator(options: SpecificCreateDecoratorOptions<'constructorParameter'> = {}): ConstructorParameterDecorator {
  return createDecorator({ ...options, constructorParameter: true }, options.handler);
}

export function createParameterDecorator(options: SpecificCreateDecoratorOptions<'parameter'> = {}): ParameterDecorator & ConstructorParameterDecorator {
  return createDecorator({ ...options, parameter: true }, options.handler);
}

export function wrapDecoratorFactory<T extends (...args: any[]) => DecoratorUnion>(decoratorFactory: T, options?: WrapDecoratorOptions): T {
  function wrappedDecoratorFactory(...args: Parameters<T>): Decorator {
    const decorator = decoratorFactory(...args) as Decorator;
    return wrapDecorator(decorator, options);
  }

  return wrappedDecoratorFactory as T;
}

export function wrapDecorator<T extends DecoratorUnion>(decorator: T, options?: WrapDecoratorOptions): T {
  const wrappedDecorator = createDecorator(
    {
      class: true,
      property: true,
      method: true,
      parameter: true,
      methodParameter: true,
      constructorParameter: true,
      ...options
    },
    (data, metadata, args) => {
      options?.handler?.(data, metadata, args);
      return (decorator as Decorator)(...args as [any, any, any]); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    }
  );

  return wrappedDecorator as T;
}

export function getConstructor<T extends AbstractConstructor = AbstractConstructor>(constructorOrTarget: object): T {
  return isFunction<T>(constructorOrTarget)
    ? constructorOrTarget
    : (constructorOrTarget.constructor as T);
}

export function getTypeInfoString(type: AbstractConstructor): string {
  const lines: string[] = [];

  const metadata = reflectionRegistry.getMetadata(type);
  const constructorParameters = metadata?.parameters?.map((parameter) => parameter.type?.name ?? '<unknown>').join(', ') ?? '?';

  lines.push(`${type.name}(${constructorParameters})`);

  for (const [key, propertyMetadata] of (metadata?.staticProperties ?? [])) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    lines.push(`  static ${propertyKey}: ${propertyMetadata.type.name}`);
  }

  for (const [key, methodMetadata] of (metadata?.staticMethods ?? [])) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    const parameters = methodMetadata.parameters.map((parameter) => parameter.type.name).join(', ');
    lines.push(`  static ${propertyKey}(${parameters}): ${methodMetadata.returnType?.name ?? 'void'}`);
  }

  for (const [key, propertyMetadata] of (metadata?.properties ?? [])) {
    const propertyKey = isSymbol(key) ? `[${key.toString()}]` : key;
    lines.push(`  ${propertyKey}: ${propertyMetadata.type.name}`);
  }

  for (const [key, methodMetadata] of (metadata?.methods ?? [])) {
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
