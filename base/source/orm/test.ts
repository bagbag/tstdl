import { Property, Class } from '#/schema';

@Class()
class TestEntity {
  @Property()
  name: string;
}
