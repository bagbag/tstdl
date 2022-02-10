import type { StringMap } from '../types';
import type { KeyValueStore } from './key-value.store';

export abstract class KeyValueStoreProvider {
  abstract get<KV extends StringMap>(module: string): KeyValueStore<KV>;
}
