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

  readonly minimumLength: number | null;
  readonly maximumLength: number | null;

  constructor(options?: Uint8ArraySchemaOptions) {
    super('Uint8Array', isUint8Array, options, {
      constraints: [
        isDefined(options?.minimumLength) ? (value) => (value.byteLength >= this.minimumLength!) ? ({ success: true }) : ({ success: false, error: `Size must be at least ${this.minimumLength} bytes.` }) : null,
        isDefined(options?.maximumLength) ? (value) => (value.byteLength <= this.maximumLength!) ? ({ success: true }) : ({ success: false, error: `Size must be at most ${this.maximumLength} bytes.` }) : null
      ]
    });

    this.minimumLength = options?.minimumLength ?? null;
    this.maximumLength = options?.maximumLength ?? null;
  }
}

export function uint8Array(options?: Uint8ArraySchemaOptions): Uint8ArraySchema {
  return new Uint8ArraySchema(options);
}

export function Uint8ArrayProperty(options?: Uint8ArraySchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(uint8Array(options), options);
}
