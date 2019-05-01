import { toArray } from '@common-ts/base/utils';
import { Redis } from 'ioredis';
import { conditional } from './utils';
import { getCursor } from './cursor';
import { AsyncEnumerable } from '@common-ts/base/enumerable';

export type SortedSetEntry = { score: number, member: string };

type AddOptions =
  | { updateOnly?: true, addOnly?: false, returnChanged?: boolean, increment?: false }
  | { updateOnly?: false, addOnly?: true, returnChanged?: boolean, increment?: false };

type AddIncrementOptions =
  | { updateOnly?: true, addOnly?: false, returnChanged?: boolean, increment: true }
  | { updateOnly?: false, addOnly?: true, returnChanged?: boolean, increment: true };

type CombineOptions = { weights?: number[], aggregate?: 'sum' | 'min' | 'max' };

type Limit = { offset: number, count: number };

export type BlockingPopResult = { set: RedisSortedSet, entry: SortedSetEntry };

enum ReplyOrder {
  ScoresFirst,
  MembersFirst
}

export class RedisSortedSet {
  private readonly redis: Redis; // | RedisTransaction;
  private readonly key: string;

  constructor(redis: Redis, key: string) {
    this.redis = redis;
    this.key = key;
  }

  async add(entries: SortedSetEntry | SortedSetEntry[], { updateOnly = false, addOnly = false, returnChanged = false, increment = false }: AddOptions | AddIncrementOptions = {}): Promise<number> {
    const args: string[] = [...conditional(updateOnly, 'XX'), ...conditional(addOnly, 'NX'), ...conditional(returnChanged, 'CH'), ...conditional(increment, 'INCR')];
    const entriesArgs = toArray(entries).flatMap(({ score, member }) => [score.toString(), member]);

    const reply = await this.redis.zadd(this.key, ...args, ...entriesArgs);

    return (typeof reply == 'string')
      ? parseFloat(reply)
      : reply;
  }

  async blockPopMax(timeout: number): Promise<undefined | BlockingPopResult>;
  async blockPopMax(sets: RedisSortedSet[], timeout: number): Promise<undefined | BlockingPopResult>;
  async blockPopMax(setsOrTimeout: RedisSortedSet[] | number, timeoutOrUndefined?: number): Promise<undefined | BlockingPopResult> {
    return this.blockPop('bzpopmax', setsOrTimeout, timeoutOrUndefined);
  }

  async blockPopMin(timeout: number): Promise<undefined | BlockingPopResult>;
  async blockPopMin(sets: RedisSortedSet[], timeout: number): Promise<undefined | BlockingPopResult>;
  async blockPopMin(setsOrTimeout: RedisSortedSet[] | number, timeoutOrUndefined?: number): Promise<undefined | BlockingPopResult> {
    return this.blockPop('bzpopmin', setsOrTimeout, timeoutOrUndefined);
  }

  async card(): Promise<number> {
    return this.redis.zcard(this.key);
  }

  async count(min: number, max: number): Promise<number> {
    return this.redis.zcount(this.key, min, max);
  }

  async increment(member: string, amount: number): Promise<number> {
    const reply = await this.redis.zincrby(this.key, amount, member) as string;
    return parseFloat(reply);
  }

  async intersect(destionation: RedisSortedSet, sets: RedisSortedSet[], options: CombineOptions): Promise<number> {
    return this.combine('zinterstore', destionation, sets, options);
  }

  async lexicalCount(min: string, max: string): Promise<number> {
    return this.redis.zlexcount(this.key, min, max);
  }

  async popMin(count: number): Promise<SortedSetEntry[]> {
    const reply = await this.redis.zpopmin(this.key, count);
    return parseEntriesReply(reply, ReplyOrder.ScoresFirst);
  }

  async popMax(count: number): Promise<SortedSetEntry[]> {
    const reply = await this.redis.zpopmax(this.key, count);
    return parseEntriesReply(reply, ReplyOrder.ScoresFirst);
  }

  async range(start: number, stop: number, withScores: false, reverse?: boolean): Promise<string[]>;
  async range(start: number, stop: number, withScores: true, reverse?: boolean): Promise<| SortedSetEntry[]>;
  async range(start: number, stop: number, withScores: boolean, reverse: boolean = false): Promise<string[] | SortedSetEntry[]> {
    const command = reverse ? 'zrevrange' : 'zrange';
    const reply = await this.redis[command](this.key, start, stop, withScores ? 'WITHSCORES' : undefined) as string[];

    const result = withScores
      ? parseEntriesReply(reply, ReplyOrder.MembersFirst)
      : reply;

    return result;
  }

  async rangeByLex(min: string, max: string, { reverse = false, limit }: { reverse?: boolean, limit?: Limit } = {}): Promise<string[]> {
    const command = reverse ? 'zrevrangebylex' : 'zrangebylex';

    return (limit == undefined)
      ? this.redis[command](this.key, min, max)
      : this.redis[command](this.key, min, max, 'LIMIT', limit.offset, limit.count);
  }

  async rangeByScore(min: number, max: number, withScores: false, options?: { reverse?: boolean, limit?: Limit }): Promise<string[]>;
  async rangeByScore(min: number, max: number, withScores: true, options?: { reverse?: boolean, limit?: Limit }): Promise<SortedSetEntry[]>;
  async rangeByScore(min: number, max: number, withScores: boolean, { reverse = false, limit }: { reverse?: boolean, limit?: Limit } = {}): Promise<string[] | SortedSetEntry[]> {
    const command = reverse ? 'zrevrangebyscore' : 'zrangebyscore';
    const args = [
      ...conditional(withScores, 'WITHSCORES'),
      ...conditional(limit != undefined, ['LIMIT', (limit as Limit).offset.toString(), (limit as Limit).count.toString()])
    ];

    const reply = await (this.redis[command](this.key, min, max, ...args) as Promise<string[]>);

    const result = withScores
      ? parseEntriesReply(reply, ReplyOrder.MembersFirst)
      : reply;

    throw new Error('check if ReplyOrder is correct');

    return result;
  }

  async rank(member: string, reverse: boolean = false): Promise<number | undefined> {
    const command = reverse ? 'zrevrank' : 'zrank';
    const reply = await this.redis[command](this.key, member) as number | null;

    if (reply == undefined) {
      return undefined;
    }

    return reply;
  }

  async remove(members: string[]): Promise<number> {
    return this.redis.zrem(this.key, ...members) as Promise<number>;
  }

  async removeRangeByLex(min: string, max: string): Promise<number> {
    return this.redis.zremrangebylex(this.key, min, max);
  }

  async removeRangeByRank(start: number, stop: number): Promise<number> {
    return this.redis.zremrangebyrank(this.key, start, stop) as Promise<number>;
  }

  async removeRangeByScore(min: number, max: number): Promise<number> {
    return this.redis.zremrangebyscore(this.key, min, max) as Promise<number>;
  }

  async *scan(options: { pattern?: string, count?: number } = {}): AsyncIterableIterator<SortedSetEntry> {
    const cursor = getCursor(this.redis, this.key, 'zscan', options);

    for await (const [member, scoreString] of cursor) {
      const score = parseFloat(scoreString);
      yield { score, member };
    }
  }

  async score(member: string): Promise<number> {
    const reply = await this.redis.zscore(this.key, member);
    const score = parseFloat(reply);

    return score;
  }

  async union(destionation: RedisSortedSet, sets: RedisSortedSet[], options: CombineOptions): Promise<number> {
    return this.combine('zunionstore', destionation, sets, options);
  }

  private async blockPop(type: 'bzpopmin' | 'bzpopmax', setsOrTimeout: RedisSortedSet[] | number, timeoutOrUndefined?: number): Promise<undefined | BlockingPopResult> {
    const setsArray = (typeof setsOrTimeout == 'number') ? [this] : [this, ...setsOrTimeout];
    const timeout = (typeof setsOrTimeout == 'number') ? setsOrTimeout : timeoutOrUndefined as number;
    const keys = setsArray.map((set) => set.key);
    const sets = new Map(setsArray.map((set) => [set.key, set]));

    const reply = await this.redis[type](keys, timeout);

    if (reply == undefined) {
      return undefined;
    }

    const [key, scoreString, member] = reply;
    const set = sets.get(key);
    const entry: SortedSetEntry = {
      score: parseFloat(scoreString),
      member
    };

    if (set == undefined) {
      throw new Error('returned origin set not found');
    }

    return { set, entry };
  }

  private async combine(type: 'zunionstore' | 'zinterstore', destination: RedisSortedSet, sets: RedisSortedSet[], options: CombineOptions): Promise<number> {
    const keys = sets.map((set) => set.key);
    const args = [
      ...conditional(options.weights != undefined, ['WEIGHTS', ...(options.weights as number[]).map((value) => value.toString())]),
      ...conditional(options.aggregate != undefined, ['AGGREGATE', (options.aggregate as string).toUpperCase()])
    ];

    return this.redis[type](destination.key, sets.length, this.key, ...keys, ...args) as Promise<number>;
  }
}

function parseEntriesReply(reply: string[], order: ReplyOrder): SortedSetEntry[] {
  const entries: SortedSetEntry[] = [];

  switch (order) {
    case ReplyOrder.ScoresFirst:
      for (let i = 0; i < reply.length; i++) {
        const score = parseFloat(reply[i]);
        const member = reply[i + 1];

        entries.push({ score, member });
      }
      break;

    case ReplyOrder.MembersFirst:
      for (let i = 0; i < reply.length; i++) {
        const score = parseFloat(reply[i + 1]);
        const member = reply[i];

        entries.push({ score, member });
      }
      break;

    default:
      throw new Error('unknown order');
  }

  return entries;
}
