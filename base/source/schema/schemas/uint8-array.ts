import { isDefined, isUint8Array } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type Uint8ArraySchemaOptions = SimpleSchemaOptions & {
  /** Minimum byte length */
  minimumLength?: number,

  /** Maximum byte length */
  maximumLength?: number
};

export class Uint8ArraySchema extends SimpleSchema<Uint8Array> {
  override readonly name = 'Uint8Array';

  readonly options: Uint8ArraySchemaOptions;

  constructor(options?: Uint8ArraySchemaOptions) {
    super('Uint8Array', isUint8Array, options, {
      constraints: [
        isDefined(options?.minimumLength) ? (value) => (value.byteLength >= options.minimumLength!) ? ({ success: true }) : ({ success: false, error: `Size must be at least ${options.minimumLength} bytes.` }) : null,
        isDefined(options?.maximumLength) ? (value) => (value.byteLength <= options.maximumLength!) ? ({ success: true }) : ({ success: false, error: `Size must be at most ${options.maximumLength} bytes.` }) : null
      ]
    });
  }
}

export function uint8Array(options?: Uint8ArraySchemaOptions): Uint8ArraySchema {
  return new Uint8ArraySchema(options);
}

export function Uint8ArrayProperty(schemaOptions?: Uint8ArraySchemaOptions, options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(uint8Array(schemaOptions), options);
}
