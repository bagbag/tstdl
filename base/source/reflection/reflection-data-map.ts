import type { Record } from '#/types.js';
import { merge } from '#/utils/merge.js';
import { objectEntries } from '#/utils/object/object.js';
import { isUndefined } from '#/utils/type-guards.js';

export class ReflectionDataMap {
  private readonly data: Map<PropertyKey, any>;

  constructor() {
    this.data = new Map();
  }

  has(key: PropertyKey): boolean {
    return this.data.has(key);
  }

  tryGet<T>(key: PropertyKey): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  get<T>(key: PropertyKey): T {
    const data = this.tryGet<T>(key);

    if (isUndefined(data)) {
      throw new Error(`No data for ${String(key)} available.`);
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

  setMany(data: Record, mergeValues: boolean = false): void {
    for (const [key, value] of objectEntries(data)) {
      this.set(key, value, mergeValues);
    }
  }
}
