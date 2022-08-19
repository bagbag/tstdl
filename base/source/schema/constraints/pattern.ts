/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { createSchemaValueConstraintDecorator } from '../decorators/utils';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';

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

  validate(value: string, path: JsonPath): ConstraintResult {
    if (!this.pattern.test(value)) {
      return { success: false, error: SchemaError.expectedButGot(this.expects, `"${value}"`, path) };
    }

    return { success: true };
  }
}

export function Pattern(pattern: RegExp, patternName?: string): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new PatternConstraint(pattern, patternName), { schema: String });
}
