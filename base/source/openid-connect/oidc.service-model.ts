export type OidcInitParameters<Data = void> = {
  endpoint: string,
  clientId: string,
  clientSecret: string,
  scope: string,

  /** how long the login flow should be valid in milliseconds */
  expiration: number,

  /** custom data */
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
