/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { isDefined } from '#/utils/type-guards';
import { MaximumLengthConstraint, MinimumLengthConstraint, PatternConstraint } from '../constraints';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import { LowercaseTransformer, TrimTransformer, UppercaseTransformer } from '../transformers';
import type { Coercible, SchemaValueConstraint, SchemaValueTransformer, ValueSchema } from '../types';
import { valueSchema } from '../types';

export type StringOptions = Coercible & {
  /** trim */
  trim?: boolean,

  /** lowercase */
  lowercase?: boolean,

  /** uppercase */
  uppercase?: boolean,

  /** minimum length */
  minimumLength?: number,

  /** maximum length */
  maximumLength?: number,

  /** regular expression */
  pattern?: string | RegExp,

  /** regular expression flags */
  patternFlags?: string,

  /** name for errors */
  patternName?: string
};

export function string(options: StringOptions = {}): ValueSchema<string> {
  const constraints: SchemaValueConstraint[] = [];
  const transformers: SchemaValueTransformer[] = [];

  if (isDefined(options.minimumLength)) {
    constraints.push(new MinimumLengthConstraint(options.minimumLength));
  }

  if (isDefined(options.maximumLength)) {
    constraints.push(new MaximumLengthConstraint(options.maximumLength));
  }

  if (isDefined(options.pattern)) {
    const pattern = RegExp(options.pattern, options.patternFlags);
    constraints.push(new PatternConstraint(pattern, options.patternName));
  }

  if (isDefined(options.trim)) {
    transformers.push(new TrimTransformer());
  }

  if (isDefined(options.lowercase)) {
    transformers.push(new LowercaseTransformer());
  }

  if (isDefined(options.uppercase)) {
    transformers.push(new UppercaseTransformer());
  }

  return valueSchema<string>(globalThis.String, {
    coerce: options.coerce,
    valueConstraints: constraints,
    transformers
  });
}

export function String(options?: StringOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(string(options));
}
