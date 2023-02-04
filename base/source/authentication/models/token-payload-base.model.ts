import { Property } from '#/schema/decorators/property';

export class TokenPayloadBase {
  @Property()
  jti: string;

  @Property()
  iat: number;

  @Property()
  exp: number;
}
