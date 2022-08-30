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

export type OidcGetTokenParametersBase<GrantType extends string> = {
  endpoint: string,
  grantType: GrantType,
  clientId: string,
  clientSecret: string,
  authType?: 'body' | 'basic-auth'
};

export type OidcGetTokenParametersWithClientCredentials = OidcGetTokenParametersBase<'client_credentials'> & {
  scope?: string
};

export type OidcGetTokenParametersWithAuthorizationCode = OidcGetTokenParametersBase<'authorization_code'> & {
  scope?: string,
  code: string,
  codeVerifier: string,
  redirectUri: string
};

export type OidcGetTokenParameters = OidcGetTokenParametersWithClientCredentials | OidcGetTokenParametersWithAuthorizationCode;

export type OidcRefreshTokenParameters = {
  endpoint: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
};
