/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { createSchemaValueConstraintDecorator } from '../decorators/utils.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import { typeSchema, type ConstraintContext, type ConstraintResult } from '../types/types.js';

export class PatternConstraint extends SchemaValueConstraint {
  private readonly pattern: RegExp;
  private readonly patternName: string | undefined;

  readonly suitableTypes = String;
  readonly expects: string;

  constructor(pattern: RegExp, patternName: string = 'a pattern') {
    super();

    this.pattern = pattern;
    this.patternName = patternName;
    this.expects = `matching ${this.patternName}`;
  }

  validate(value: string, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (!this.pattern.test(value)) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, `"${value}"`, path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function Pattern(pattern: RegExp, patternName?: string): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new PatternConstraint(pattern, patternName), { schema: typeSchema(String) });
}
