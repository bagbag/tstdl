import { Serializer } from '@common-ts/base/serializer';
import { Redis } from 'ioredis';

enum SetResult {
  New = 1,
  Updated = 0
}

export class RedisHash<T> {
  private readonly redis: Redis;
  private readonly key: string;

  constructor(redis: Redis, key: string) {
    this.redis = redis;
    this.key = key;
  }

  async exists<Field extends keyof T>(field: Field): Promise<boolean> {
    const exists = await this.redis.hexists(this.key, field as string);
    return exists == 1;
  }

  async get<Field extends keyof T>(field: Field, throwIfNotFound?: true): Promise<T[Field]>;
  async get<Field extends keyof T>(field: Field, throwIfNotFound: boolean): Promise<T[Field] | undefined>;
  async get<Field extends keyof T>(field: Field, throwIfNotFound: boolean = true): Promise<T[Field] | undefined> {
    const result = await this.redis.hget(this.key, field as string);

    if (result == undefined) {
      if (throwIfNotFound) {
        throw new Error('not found');
      }

      return undefined;
    }

    return Serializer.deserialize(result);
  }

  async set<Field extends keyof T>(field: Field, value: T[Field]): Promise<SetResult> {
    const serialized = Serializer.serialize(value);
    return this.redis.hset(this.key, field as string, serialized);
  }

  async delete<Field extends keyof T>(...fields: Field[]): Promise<number> {
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

  async increase(value: number, asFloat: boolean): Promise<number> {

  }
}
