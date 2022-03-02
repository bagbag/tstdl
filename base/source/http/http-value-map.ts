import { BadRequestError } from '#/error/bad-request.error';
import type { OneOrMany, Record } from '#/types';
import { toArray } from '#/utils/array';
import { isIterable } from '#/utils/iterable-helpers/is-iterable';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards';
import type { HttpValue, NormalizedHttpValue, NormalizedHttpValueObject } from './types';
import { denormalizeHttpValue, normalizeHttpValue } from './types';

export type HttpValueMapInput = Record<string, OneOrMany<HttpValue> | undefined> | Iterable<[string, OneOrMany<HttpValue> | undefined]>;

export abstract class HttpValueMap<TThis extends HttpValueMap<any>> implements Iterable<[string, OneOrMany<HttpValue>]> {
  private readonly valueType: string;
  private readonly caseInsensitive: boolean;
  private readonly map: Map<string, { value: OneOrMany<HttpValue>, actualKey: string }>;

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
    const lowercasedKey = this.normalizeKey(key);

    if (!this.has(lowercasedKey)) {
      throw new BadRequestError(`missing ${lowercasedKey} ${this.valueType}`);
    }

    return this.map.get(lowercasedKey)!.value;
  }

  /** try to get value */
  tryGet(key: string): OneOrMany<HttpValue> | undefined {
    return this.map.get(this.normalizeKey(key))?.value;
  }

  /** get single value, throws if multiple values are set */
  getSingle(key: string): HttpValue {
    const lowercasedKey = this.normalizeKey(key);
    const value = this.tryGetSingle(lowercasedKey);

    if (isUndefined(value)) {
      throw new BadRequestError(`missing ${lowercasedKey} ${this.valueType}`);
    }

    return value;
  }

  /** try to get single value, throws if multiple values are set */
  tryGetSingle(key: string): HttpValue | undefined {
    const lowercasedKey = this.normalizeKey(key);
    const value = this.map.get(lowercasedKey)?.value;

    if (isArray(value)) {
      throw new BadRequestError(`invalid ${lowercasedKey} ${this.valueType}. Expected single value`);
    }

    return value;
  }

  /** replace entry */
  set(key: string, value: OneOrMany<HttpValue> | undefined): void {
    if (isUndefined(value)) {
      this.remove(key);
      return;
    }

    this.map.set(this.normalizeKey(key), { value: denormalizeHttpValue(value), actualKey: key });
  }

  /** set entry if missing */
  setIfMissing(key: string, value: OneOrMany<HttpValue> | undefined): void {
    if (!this.has(key)) {
      this.set(key, value);
    }
  }

  setMany(input: HttpValueMapInput): void {
    const iterable = isIterable(input) ? input : Object.entries(input);

    for (const [key, value] of iterable) {
      if (isDefined(value)) {
        this.set(key, value);
      }
    }
  }

  /** add value to existing entry or create new entry */
  append(key: string, value: OneOrMany<HttpValue>): void {
    const lowercasedKey = this.normalizeKey(key);
    const existing = this.tryGet(lowercasedKey);
    const newValue = isUndefined(existing) ? value : [...toArray(existing), ...toArray(value)];

    this.set(lowercasedKey, newValue);
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
    for (const [, { value, actualKey }] of this.map) {
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
