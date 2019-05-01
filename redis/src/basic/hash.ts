import { PropertiesOfType, StringMap } from '@common-ts/base/types';
import { Pipeline, Redis } from 'ioredis';
import { RedisTransaction } from '../transaction';
import { getCursor } from './cursor';

enum SetResult {
  New = 1,
  Updated = 0
}

type Fields<T> = keyof T & string;

export class RedisHash {
  private readonly redis: Redis | RedisTransaction;
  private readonly key: string;

  constructor(redis: Redis, key: string) {
    this.redis = redis;
    this.key = key;
  }

  async exists<Field extends Fields<T>>(field: Field): Promise<boolean> {
    const exists = await this.redis.hexists(this.key, field as string);
    return exists == 1;
  }

  async get<Field extends Fields<T>>(field: Field, throwIfNotFound?: true): Promise<T[Field]>;
  async get<Field extends Fields<T>>(field: Field, throwIfNotFound: boolean): Promise<T[Field] | undefined>;
  async get<Field extends Fields<T>>(field: Field, throwIfNotFound: boolean = true): Promise<T[Field] | undefined> {
    const result = await this.redis.hget(this.key, field as string);

    if (result == undefined) {
      if (throwIfNotFound) {
        throw new Error('not found');
      }

      return undefined;
    }

    return Serializer.deserialize(result);
  }

  async set<Field extends Fields<T>>(field: Field, value: T[Field]): Promise<SetResult> {
    const serialized = Serializer.serialize(value);
    return this.redis.hset(this.key, field as string, serialized);
  }

  async delete<Field extends Fields<T>>(...fields: Field[]): Promise<number> {
    return this.redis.hdel(this.key, ...fields as string[]) as Promise<number>;
  }

  async getAll(): Promise<Partial<T>> {
    const reply = await this.redis.hgetall(this.key) as string[];

    let result = {};

    for (let i = 0; i < reply.length; i += 2) {
      const field = reply[i];
      const serialized = reply[i + 1];
      const value = Serializer.deserialize(serialized);

      result = { ...result, [field]: value };
    }

    return result;
  }

  async increase<Field extends PropertiesOfType<T, number> & string>(field: Field, increment: number, asFloat: boolean): Promise<number> {
    return asFloat
      ? this.redis.hincrbyfloat(this.key, field, increment)
      : this.redis.hincrby(this.key, field, increment);
  }

  async fields(): Promise<string[]> {
    return this.redis.hkeys(this.key) as Promise<string[]>;
  }

  async values(): Promise<T[keyof T][]> {
    const reply = await (this.redis.hvals(this.key) as Promise<string[]>);
    const values = reply.map((serialized) => Serializer.deserialize(serialized));

    return values as T[keyof T][];
  }

  async length(): Promise<number> {
    return this.redis.hlen(this.key);
  }

  async getMany<Field extends Fields<T>>(...fields: Field[]): Promise<Partial<{ [P in Field]: T[Field] }>> {
    const reply = await (this.redis.hmget(this.key, ...fields) as Promise<(string | null)[]>);
    const result: Partial<{ [P in Field]: T[Field] }> = {};

    for (let i = 0; i < fields.length; i++) {
      const value = reply[i];

      if (value != undefined) {
        result[fields[i]] = value;
      }
    }

    return result;
  }

  async setMany<Field extends Fields<T>>(values: Partial<{ [P in Field]: T[P] }>): Promise<void> {
    const args = Object.entries(values).flat();
    await this.redis.hmset(this.key, ...args);
  }

  async *scan(options: { pattern?: string, count?: number } = {}): AsyncIterableIterator<SortedSetEntry> {
    const cursor = getCursor(this.redis, this.key, 'hscan', options);

    for await (const [field, value] of cursor) {
      yield { field, value };
    }
  }
}
