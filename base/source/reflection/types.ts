import type { Constructor, Record } from '#/types';
import type { UnionToIntersection } from 'type-fest';
import type { ConstructorParameterMetadata, MethodMetadata, MethodParameterMetadata, ParameterMetadata, PropertyMetadata, TypeMetadata } from './registry';

export type DecoratorType = 'class' | 'property' | 'accessor' | 'method' | 'parameter' | 'methodParameter' | 'constructorParameter';
export type DecoratorHandler<T extends DecoratorType = DecoratorType> = (data: DecoratorData<T>, metadata: DecoratorMetadata<T>) => DecoratorHandlerReturnType<T>;
export type DecoratorHandlerReturnType<T extends DecoratorType = DecoratorType> = DecoratorOptionsTypeMap<DecoratorHandlerReturnTypeMap, T>;
export type Decorator<T extends DecoratorType = DecoratorType> = DecoratorOptionsTypeMapIntersection<DecoratorMap, T>;
export type DecoratorData<T extends DecoratorType = DecoratorType> = DecoratorOptionsTypeMap<DecoratorDataMap, T>;
export type DecoratorMetadata<T extends DecoratorType = DecoratorType> = DecoratorOptionsTypeMap<DecoratorMetadataMap, T>;

export type DecoratorTypeMap<T extends Record<DecoratorType> = Record<DecoratorType>> = T;
export type DecoratorOptionsTypeMap<T extends DecoratorTypeMap, U extends DecoratorType> = { [D in U]: T[D] }[U];
export type DecoratorOptionsTypeMapIntersection<T extends DecoratorTypeMap, U extends DecoratorType> = UnionToIntersection<DecoratorOptionsTypeMap<T, U>>;

export type DecoratorDataMap = DecoratorTypeMap<{
  class: ClassDecoratorData,
  property: PropertyDecoratorData,
  accessor: AccessorDecoratorData,
  method: MethodDecoratorData,
  parameter: ParameterDecoratorData,
  methodParameter: MethodParameterDecoratorData,
  constructorParameter: ConstructorParameterDecoratorData
}>;

export type DecoratorMetadataMap = DecoratorTypeMap<{
  class: TypeMetadata,
  property: PropertyMetadata,
  accessor: PropertyMetadata,
  method: MethodMetadata,
  parameter: ParameterMetadata,
  methodParameter: MethodParameterMetadata,
  constructorParameter: ConstructorParameterMetadata
}>;

export type DecoratorHandlerReturnTypeMap = DecoratorTypeMap<{
  class: void | undefined | Constructor,
  property: void,
  accessor: void,
  method: void | PropertyDescriptor,
  parameter: void,
  methodParameter: void,
  constructorParameter: void
}>;

export type DecoratorMap = DecoratorTypeMap<{
  class: ClassDecorator,
  property: PropertyDecorator,
  accessor: MethodDecorator,
  method: MethodDecorator,
  parameter: ParameterDecorator,
  methodParameter: ParameterDecorator,
  constructorParameter: ParameterDecorator
}>;

export type DecoratorDataBase<Type extends string> = {
  type: Type,
  constructor: Constructor,
  prototype: object
};

export type ClassDecoratorData = DecoratorDataBase<'class'>;

export type PropertyDecoratorData = DecoratorDataBase<'property'> & {
  static: boolean,
  propertyKey: string | symbol
};

export type AccessorDecoratorData = DecoratorDataBase<'accessor'> & {
  static: boolean,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
};

export type PropertyOrAccessorDecoratorData = PropertyDecoratorData | AccessorDecoratorData;

export type MethodDecoratorData = DecoratorDataBase<'method'> & {
  static: boolean,
  methodKey: string | symbol,
  descriptor: PropertyDescriptor
};

export type MethodParameterDecoratorData = DecoratorDataBase<'parameter'> & {
  static: boolean,
  methodKey: string | symbol,
  index: number
};

export type ConstructorParameterDecoratorData = DecoratorDataBase<'constructor-parameter'> & {
  index: number
};

export type ParameterDecoratorData = MethodParameterDecoratorData | ConstructorParameterDecoratorData;

export type ClassDecoratorHandler = DecoratorHandler<'class'>;
export type PropertyDecoratorHandler = DecoratorHandler<'property'>;
export type AccessorDecoratorHandler = DecoratorHandler<'accessor'>;
export type PropertyOrAccessorDecoratorHandler = DecoratorHandler<'property' | 'accessor'>;
export type MethodDecoratorHandler = DecoratorHandler<'method'>;
export type ParameterDecoratorHandler = DecoratorHandler<'parameter'>;
export type ConstructorParameterDecoratorHandler = DecoratorHandler<'constructorParameter'>;
export type MethodParameterDecoratorHandler = DecoratorHandler<'methodParameter'>;
