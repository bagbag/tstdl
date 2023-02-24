import type { Entity, NewEntity } from '#/database/index.js';

export type OidcState<Data = any> = Entity & {
  value: string,
  codeVerifier: string,
  endpoint: string,
  clientId: string,
  clientSecret: string,
  expiration: number,
  data: Data
};

export type NewOidcState<Data = any> = NewEntity<OidcState<Data>>;
