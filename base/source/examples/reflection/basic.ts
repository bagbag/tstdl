import { Accessor, Class, Method, Parameter, printType, Property, ReflectionRegistry } from '#/reflection';


@Class(undefined, { data: { tableName: 'foos' } })
export class Foo {
  private readonly registry: ReflectionRegistry;

  @Accessor()
  get someGetter(): number {
    return 5;
  }

  @Accessor()
  static get someStaticGetter(): number {
    return 5;
  }

  @Property()
  someProperty: number;

  @Property()
  static someStaticProperty: number;

  constructor(@Parameter() registry: ReflectionRegistry) {
    this.registry = registry;
  }

  @Method()
  static someStaticMethod(@Parameter() _parameter: string): void { }

  @Method()
  someMethod(@Parameter() _parameter: bigint): void { }
}

printType(Foo);
