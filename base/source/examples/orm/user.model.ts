import { Array, Entity, Enum, Integer, Text, Unique } from '#/orm/index.js';
import { BooleanProperty, StringProperty } from '#/schema/index.js';

export enum Foo {
  Bar = 0,
  Baz = 1
}

export class User extends Entity {
  static entityName = 'User';

  @StringProperty()
  name: string;

  @Array(String)
  nickNames: string[];

  @Integer({ nullable: true })
  age: Integer | null;

  @BooleanProperty()
  hasAge: boolean;

  @Unique()
  mail: string;

  foo: Enum<typeof Foo>;
}
