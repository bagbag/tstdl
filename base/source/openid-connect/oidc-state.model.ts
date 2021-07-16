import type { Entity, NewEntity } from '#/database';

export type OidcState<Data = unknown> = Entity & {
  value: string,
  codeVerifier: string,
  endpoint: string,
  clientId: string,
  clientSecret: string,
  expiration: number,
  data: Data
};

export type NewOidcState = NewEntity<OidcState>;
