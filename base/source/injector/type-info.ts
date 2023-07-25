import type { OneOrMany } from '#/types.js';
import type { Provider } from './provider.js';
import type { InjectionToken } from './token.js';
import type { ArgumentProvider, ForwardRefInjectionToken, Mapper, RegistrationOptions } from './types.js';

export type InjectableMetadata<T, A> = RegistrationOptions<T, A> & {
  /** aliases (tokens) for the class. Useful for example for circular dependencies when you can't use the class itself as a token */
  alias?: OneOrMany<InjectionToken>,

  /** custom provider. Useful for example if initialization is required */
  provider?: Provider<T, A>
};

export type InjectMetadata = {
  /** token overwrite by inject decorator */
  injectToken?: InjectionToken,

  /** if defined, resolve the ForwardRefToken using ForwardRef strategy instead resolving the token */
  forwardRefToken?: ForwardRefInjectionToken,

  /** whether injection is optional if token is not registered. Set by optional decorator */
  optional?: boolean,

  /** mapper to map resolved value */
  mapper?: Mapper,

  /** provider to get resolve argument */
  resolveArgumentProvider?: ArgumentProvider,

  /** if defined, map the resolve argument and use the returned value as the value to inject */
  injectArgumentMapper?: Mapper,

  /** if defined, use the provided argument, map it and pass it to the resolution of the token */
  forwardArgumentMapper?: Mapper
};
