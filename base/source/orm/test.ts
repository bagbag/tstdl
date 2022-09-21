import { Property, Type } from '#/schema';

@Type()
class TestEntity {
  @Property()
  name: string;
}
