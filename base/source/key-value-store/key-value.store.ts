import { type Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { StringMap } from '../types.js';

/** Key value store module */
export type KeyValueStoreArgument = string;

export abstract class KeyValueStore<KV extends StringMap> implements Resolvable<KeyValueStoreArgument> {
  readonly module: string;

  declare readonly [resolveArgumentType]: KeyValueStoreArgument;
  constructor(module: string) {
    this.module = module;
  }

  /** Get value of key */
  abstract get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;

  /** Get value of key */
  abstract get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<KV[K] | D>;

  /** Set key */
  abstract set<K extends keyof KV>(key: K, value: KV[K]): Promise<void>;

  /** Set multiple keys */
  abstract setMany(keyValues: Partial<KV>): Promise<void>;

  /** Delete key */
  abstract delete(key: keyof KV): Promise<boolean>;

  /** Delete multiple keys */
  abstract deleteMany(keys: (keyof KV)[]): Promise<void>;

  /** Delete all keys */
  abstract clear(): Promise<void>;
}
