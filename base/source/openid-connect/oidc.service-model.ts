export type OidcInitParameters<Data = unknown> = {
  endpoint: string,
  clientId: string,
  clientSecret: string,
  scope: string,
  data: Data
};

export type OidcInitResult = {
  authorizationEndpoint: string,
  state: string,
  clientId: string,
  scope: string,
  codeChallenge: string,
  codeChallengeMethod: string
};

export type OidcToken<Raw = unknown> = {
  tokenType: string,
  expiration: number,
  accessToken: string,
  refreshToken?: string,
  raw: Raw
};

export type OidcGetTokenParameters = {
  endpoint: string,
  clientId: string,
  clientSecret: string,
  scope: string,
  code: string,
  codeVerifier: string,
  redirectUri: string
};

export type OidcRefreshTokenParameters = {
  endpoint: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
};
