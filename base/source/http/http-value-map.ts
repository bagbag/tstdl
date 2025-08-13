import { BadRequestError } from '#/errors/bad-request.error.js';
import type { OneOrMany, Record } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { isIterable } from '#/utils/iterable-helpers/is-iterable.js';
import { objectEntries } from '#/utils/object/object.js';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards.js';
import type { HttpValue, NormalizedHttpValue, NormalizedHttpValueObject } from './types.js';
import { denormalizeHttpValue, normalizeHttpValue } from './types.js';

export type HttpValueMapInput = Record<string, OneOrMany<HttpValue> | undefined> | Iterable<[string, OneOrMany<HttpValue> | undefined]>;

export abstract class HttpValueMap<TThis extends HttpValueMap<any>> implements Iterable<[string, OneOrMany<HttpValue>]> {
  private readonly valueType: string;
  private readonly caseInsensitive: boolean;
  private readonly map: Map<string, { actualKey: string, value: OneOrMany<HttpValue> }>;

  constructor(valueType: string, caseInsensitive: boolean, input?: HttpValueMapInput) {
    this.valueType = valueType;
    this.caseInsensitive = caseInsensitive;

    this.map = new Map();

    if (isDefined(input)) {
      this.setMany(input);
    }
  }

  /** check if entry is available */
  has(key: string): boolean {
    return this.map.has(this.normalizeKey(key));
  }

  /** get value. Throws if entry not set */
  get(key: string): OneOrMany<HttpValue> {
    const normalizedKey = this.normalizeKey(key);

    if (!this.has(normalizedKey)) {
      throw new BadRequestError(`Missing ${normalizedKey} ${this.valueType}`);
    }

    return this.map.get(normalizedKey)!.value;
  }

  /** try to get value */
  tryGet(key: string): OneOrMany<HttpValue> | undefined {
    return this.map.get(this.normalizeKey(key))?.value;
  }

  /** get single value, throws if multiple values are set */
  getSingle(key: string): HttpValue {
    const value = this.tryGetSingle(key);

    if (isUndefined(value)) {
      throw new BadRequestError(`Missing ${key} ${this.valueType}`);
    }

    return value;
  }

  /** try to get single value, throws if multiple values are set */
  tryGetSingle(key: string): HttpValue | undefined {
    const normalizedKey = this.normalizeKey(key);
    const value = this.map.get(normalizedKey)?.value;

    if (isArray(value)) {
      throw new BadRequestError(`Invalid ${key} ${this.valueType}. Expected single value.`);
    }

    return value;
  }

  /** replace entry */
  set(key: string, value: OneOrMany<HttpValue> | undefined): void {
    if (isUndefined(value)) {
      this.remove(key);
      return;
    }

    this.map.set(this.normalizeKey(key), { actualKey: key, value: denormalizeHttpValue(value) });
  }

  /** set entry if missing */
  setIfMissing(key: string, value: OneOrMany<HttpValue> | undefined): void {
    if (!this.has(key)) {
      this.set(key, value);
    }
  }

  setMany(input: HttpValueMapInput): void {
    const iterable = isIterable(input) ? input : objectEntries(input);

    for (const [key, value] of iterable) {
      if (isDefined(value)) {
        this.set(key, value);
      }
    }
  }

  /** add value to existing entry or create new entry */
  append(key: string, value: OneOrMany<HttpValue>): void {
    const existing = this.tryGet(key);
    const newValue = isUndefined(existing) ? value : [...toArray(existing), ...toArray(value)];

    this.set(key, newValue);
  }

  /** remove entry */
  remove(key: string): void {
    this.map.delete(this.normalizeKey(key));
  }

  /** remove all entries */
  clear(): void {
    this.map.clear();
  }

  asObject(): Record<string, OneOrMany<HttpValue>> {
    return Object.fromEntries(this);
  }

  asNormalizedObject(): NormalizedHttpValueObject {
    const entries = [...this].map(([key, value]) => [key, normalizeHttpValue(value)] as const);
    return Object.fromEntries(entries);
  }

  *normalizedEntries(): Iterable<[string, OneOrMany<NormalizedHttpValue>]> {
    for (const [key, value] of this) {
      yield [key, normalizeHttpValue(value)];
    }
  }

  *[Symbol.iterator](): Iterator<[string, OneOrMany<HttpValue>]> {
    for (const [, { actualKey, value }] of this.map) {
      yield [actualKey, value];
    }
  }

  private normalizeKey(key: string): string {
    if (this.caseInsensitive) {
      return key.toLowerCase();
    }

    return key;
  }

  abstract clone(): TThis;
}
