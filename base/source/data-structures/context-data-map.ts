import type { Record } from '#/types/index.js';
import { merge } from '#/utils/merge.js';
import { objectEntries } from '#/utils/object/object.js';
import { isArray, isUndefined } from '#/utils/type-guards.js';

export class ContextDataMap {
  private readonly data: Map<PropertyKey, any>;

  constructor() {
    this.data = new Map();
  }

  has(key: PropertyKey): boolean {
    return this.data.has(key);
  }

  tryGet<T>(key: PropertyKey): T | undefined;
  tryGet<T, D>(key: PropertyKey, defaultValue: D): T | D;
  tryGet<T, D>(key: PropertyKey, defaultValue?: D): T | D | undefined {
    const value = this.data.get(key);

    if (isUndefined(value)) {
      return defaultValue;
    }

    return value as T;
  }

  get<T>(key: PropertyKey): T {
    const data = this.tryGet<T>(key);

    if (isUndefined(data)) {
      throw new Error(`No data for key "${String(key)}" available.`);
    }

    return data;
  }

  set(key: PropertyKey, value: any, mergeValue: boolean = false): void {
    if (!mergeValue) {
      this.data.set(key, value);
      return;
    }

    const existing = this.data.get(key) ?? {};
    const newData = merge(existing, value);

    this.data.set(key, newData);
  }

  setMany(data: Record | readonly [PropertyKey, any][], mergeValues: boolean = false): void {
    const entries = isArray<[PropertyKey, any]>(data)
      ? data
      : objectEntries(data);

    for (const [key, value] of entries) {
      this.set(key, value, mergeValues);
    }
  }
}
