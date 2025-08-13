import { injectArgument } from '#/injector/inject.js';
import { type Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { Record } from '#/types/index.js';

/** Key value store module */
export type KeyValueStoreArgument = string;

export abstract class KeyValueStore<KV extends Record<string>> implements Resolvable<KeyValueStoreArgument> {
  readonly module = injectArgument(this);

  declare readonly [resolveArgumentType]: KeyValueStoreArgument;
  constructor(module: string) {
    this.module = module;
  }

  /**
   * Gets the value of a key.
   * @param key The key to get.
   * @returns The value of the key or undefined if the key doesn't exist.
   */
  abstract get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;

  /**
   * Gets the value of a key.
   * @param key The key to get.
   * @param defaultValue The default value to return if the key doesn't exist.
   * @returns The value of the key or the default value if the key doesn't exist.
   */
  abstract get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<KV[K] | D>;

  /**
   * Sets the value of a key.
   * @param key The key to set.
   * @param value The value to set.
   */
  abstract set<K extends keyof KV>(key: K, value: KV[K]): Promise<void>;

  /**
   * Get the value of a key or set it if it doesn't exist.
   * @param key The key to get or set.
   * @param value The value to set if the key doesn't exist.
   */
  abstract getOrSet<K extends keyof KV>(key: K, value: KV[K]): Promise<KV[K]>;

  /**
   * Sets multiple key-value pairs.
   * @param keyValues The key-value pairs to set.
   */
  abstract setMany(keyValues: Partial<KV>): Promise<void>;

  /**
   * Deletes a key.
   * @param key The key to delete.
   * @returns True if the key was deleted, false otherwise.
   */
  abstract delete(key: keyof KV): Promise<boolean>;

  /**
   * Deletes multiple keys.
   * @param keys The keys to delete.
   */
  abstract deleteMany(keys: (keyof KV)[]): Promise<void>;

  /**
   * Clears all key-value pairs.
   */
  abstract clear(): Promise<void>;
}
