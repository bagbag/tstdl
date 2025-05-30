import type { ForwardRefTypeHint } from '#/utils/object/forward-ref.js';
import type { InjectionToken } from './token.js';
import type { ArgumentProvider, ForwardRefInjectionToken, Mapper } from './types.js';

export type InjectMetadata = {
  /** Token overwrite by inject decorator */
  injectToken?: InjectionToken,

  /** If defined, resolve the token or ForwardRefToken using ForwardRef strategy instead of resolving the token directly */
  forwardRef?: boolean | ForwardRefInjectionToken,
  forwardRefTypeHint?: ForwardRefTypeHint,

  /** Whether injection is optional if token is not registered. Set by optional decorator */
  optional?: boolean,

  /** Whether injection should resolve all providers */
  resolveAll?: boolean,

  /** Mapper to map resolved value */
  mapper?: Mapper,

  /** Provider to get resolve argument */
  resolveArgumentProvider?: ArgumentProvider,

  /** If defined, map the resolve argument and use the returned value as the value to inject */
  injectArgumentMapper?: Mapper,

  /** If defined, use the provided argument, map it and pass it to the resolution of the token */
  forwardArgumentMapper?: Mapper,
};
