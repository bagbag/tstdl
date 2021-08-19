import { registerBinaryTypes } from './binary';
import { registerDateType } from './date';
import { registerErrorType } from './error';
import { registerFunctionType } from './function';
import { registerMapType } from './map';
import { registerRegExpType } from './regex';
import { registerSetType } from './set';

type DefaultSerializationTypesRegistrationOptions = {
  /**
   * !!! DANGEROUS !!!
   *
   * register handler for functions
   *
   * remote code execution possible, source must be trusted!
   *
   * !!! DANGEROUS !!!
   */
  registerFunctionsSerializer?: boolean
};

/**
 * registers serializers for Date, RegExp, binary types (ArrayBuffer, Uint8Array etc.), Map, Set, Error and optionally functions
 *
 * read warning before registering functions serializer
 * @param options
 */
export function registerDefaultSerializationTypes(options?: DefaultSerializationTypesRegistrationOptions): void {
  registerDateType();
  registerRegExpType();
  registerBinaryTypes();
  registerMapType();
  registerSetType();
  registerErrorType();

  if (options?.registerFunctionsSerializer == true) {
    registerFunctionType();
  }
}
