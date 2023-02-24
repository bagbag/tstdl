import type { Injectable } from '#/container/index.js';
import { resolveArgumentType } from '#/container/index.js';
import type { StringMap } from '../types.js';

/** key value store module */
export type KeyValueStoreArgument = string;

export abstract class KeyValueStore<KV extends StringMap> implements Injectable<KeyValueStoreArgument> {
  readonly module: string;

  readonly [resolveArgumentType]: KeyValueStoreArgument;

  constructor(module: string) {
    this.module = module;
  }

  /** get value of key */
  abstract get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;

  /** get value of key */
  abstract get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<KV[K] | D>;

  /** set key */
  abstract set<K extends keyof KV>(key: K, value: KV[K]): Promise<void>;

  /** set multiple keys */
  abstract setMany(keyValues: Partial<KV>): Promise<void>;

  /** delete key */
  abstract delete(key: keyof KV): Promise<boolean>;

  /** delete multiple keys */
  abstract deleteMany(keys: (keyof KV)[]): Promise<void>;

  /** delete all keys */
  abstract clear(): Promise<void>;
}
