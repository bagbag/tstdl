import { Redis } from 'ioredis';
import { conditional } from './utils';

export type SortedSetEntry = { score: number, member: string };

type AddOptions =
  | { updateOnly?: true, addOnly?: false, returnChanged?: boolean, increment?: false }
  | { updateOnly?: false, addOnly?: true, returnChanged?: boolean, increment?: false };

type AddIncrementOptions =
  | { updateOnly?: true, addOnly?: false, returnChanged?: boolean, increment: true }
  | { updateOnly?: false, addOnly?: true, returnChanged?: boolean, increment: true };

export class RedisSortedSet {
  private readonly redis: Redis; // | RedisTransaction;
  private readonly key: string;

  constructor(redis: Redis, key: string) {
    this.redis = redis;
    this.key = key;
  }

  async add(entries: SortedSetEntry[], options?: AddOptions): Promise<number>;
  async add(entries: SortedSetEntry, options?: AddIncrementOptions): Promise<number>;
  async add(entries: SortedSetEntry | SortedSetEntry[], { updateOnly = false, addOnly = false, returnChanged = false, increment = false }: AddOptions | AddIncrementOptions = {}): Promise<number> {
    const args: string[] = [...conditional(updateOnly, 'XX'), ...conditional(addOnly, 'NX'), ...conditional(returnChanged, 'CH'), ...conditional(increment, 'INCR')];

    if (increment) {
      const floatString = await this.redis.zadd(this.key, ...args, entries as SortedSetEntry) as string;
      return parseFloat(floatString);
    }


  }

  async bzpopmax(): Promise<void> {
    throw new Error('not implemented');
  }

  async bzpopmin(): Promise<void> {
    throw new Error('not implemented');
  }

  async card(): Promise<void> {
    throw new Error('not implemented');
  }

  async count(): Promise<void> {
    throw new Error('not implemented');
  }

  async incrby(): Promise<void> {
    throw new Error('not implemented');
  }

  async interstore(): Promise<void> {
    throw new Error('not implemented');
  }

  async lexcount(): Promise<void> {
    throw new Error('not implemented');
  }

  async popMin(count: number): Promise<SortedSetEntry[]> {
    const reply = await this.redis.zpopmin(this.key, count);
    return parseEntriesReply(reply);
  }

  async popMax(count: number): Promise<SortedSetEntry[]> {
    const reply = await this.redis.zpopmax(this.key, count);
    return parseEntriesReply(reply);
  }

  async range(): Promise<void> {
    throw new Error('not implemented');
  }

  async rangebylex(): Promise<void> {
    throw new Error('not implemented');
  }

  async rangebyscore(): Promise<void> {
    throw new Error('not implemented');
  }

  async rank(): Promise<void> {
    throw new Error('not implemented');
  }

  async rem(): Promise<void> {
    throw new Error('not implemented');
  }

  async remrangebylex(): Promise<void> {
    throw new Error('not implemented');
  }

  async remrangebyrank(): Promise<void> {
    throw new Error('not implemented');
  }

  async remrangebyscore(): Promise<void> {
    throw new Error('not implemented');
  }

  async revrange(): Promise<void> {
    throw new Error('not implemented');
  }

  async revrangebylex(): Promise<void> {
    throw new Error('not implemented');
  }

  async revrangebyscore(): Promise<void> {
    throw new Error('not implemented');
  }

  async revrank(): Promise<void> {
    throw new Error('not implemented');
  }

  async scan(): Promise<void> {
    throw new Error('not implemented');
  }

  async score(): Promise<void> {
    throw new Error('not implemented');
  }

  async unionstore(): Promise<void> {
    throw new Error('not implemented');
  }

}

function parseEntriesReply(reply: string[]): SortedSetEntry[] {
  const entries: SortedSetEntry[] = [];

  for (let i = 0; i < reply.length; i++) {
    const score = parseFloat(reply[i]);
    const member = reply[i + 1];

    entries.push({ score, member });
  }

  return entries;
}
