/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/types.js';
import { toArrayCopy } from '#/utils/array/array.js';
import { isDefined } from '#/utils/type-guards.js';
import { MaximumLengthConstraint, MinimumLengthConstraint, PatternConstraint } from '../constraints/index.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils.js';
import { LowercaseTransformer, TrimTransformer, UppercaseTransformer } from '../transformers/index.js';
import type { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { SchemaValueTransformer } from '../types/schema-value-transformer.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';
import { valueSchema } from '../types/types.js';

export type StringOptions = ValueSchemaOptions & {
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
  const valueConstraints: SchemaValueConstraint[] = toArrayCopy(options.valueConstraints ?? []);
  const transformers: SchemaValueTransformer[] = toArrayCopy(options.transformers ?? []);

  if (isDefined(options.minimumLength)) {
    valueConstraints.push(new MinimumLengthConstraint(options.minimumLength));
  }

  if (isDefined(options.maximumLength)) {
    valueConstraints.push(new MaximumLengthConstraint(options.maximumLength));
  }

  if (isDefined(options.pattern)) {
    const pattern = RegExp(options.pattern, options.patternFlags);
    valueConstraints.push(new PatternConstraint(pattern, options.patternName));
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

  return valueSchema<string>(String, {
    ...options,
    valueConstraints,
    transformers
  });
}

export function StringProperty(options?: StringOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(string(options));
}
