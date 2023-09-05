import type { InjectionToken } from './token.js';
import type { ArgumentProvider, ForwardRefInjectionToken, Mapper } from './types.js';

export type InjectMetadata = {
  /** token overwrite by inject decorator */
  injectToken?: InjectionToken,

  /** if defined, resolve the token or ForwardRefToken using ForwardRef strategy instead of resolving the token directly */
  forwardRef?: boolean | ForwardRefInjectionToken,

  /** whether injection is optional if token is not registered. Set by optional decorator */
  optional?: boolean,

  /** whether injection should resolve all providers */
  resolveAll?: boolean,

  /** mapper to map resolved value */
  mapper?: Mapper,

  /** provider to get resolve argument */
  resolveArgumentProvider?: ArgumentProvider,

  /** if defined, map the resolve argument and use the returned value as the value to inject */
  injectArgumentMapper?: Mapper,

  /** if defined, use the provided argument, map it and pass it to the resolution of the token */
  forwardArgumentMapper?: Mapper
};
