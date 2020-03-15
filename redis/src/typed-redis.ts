/* eslint-disable max-classes-per-file */

import { StringMap } from '@tstdl/base/types';
import { toArray } from '@tstdl/base/utils';
import { Redis } from 'ioredis';
import { Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import { RedisPipelineWrapper } from './pipeline-wrapper';
import { conditional } from './utils';

type ScanType = /* 'scan' | 'sscan' | */ 'hscan' | 'zscan';
type ScanReturnType<T extends ScanType> = {
  scan: string,
  sscan: string,
  hscan: [string, string],
  zscan: [string, string]
}[T];

export enum ExpireType {
  Seconds = 'ex',
  Milliseconds = 'px'
}

export enum UpdateType {
  OnlyNonExisting = 'nx',
  OnlyExisting = 'xx'
}

export type Message = { channel: string, message: string };

export type SortedSetEntry = { score: number, member: string };

type SortedSetAddOptions =
  | { updateOnly?: true, addOnly?: false, returnChanged?: boolean, increment?: false }
  | { updateOnly?: false, addOnly?: true, returnChanged?: boolean, increment?: false };

type SortedSetAddIncrementOptions =
  | { updateOnly?: true, addOnly?: false, returnChanged?: boolean, increment: true }
  | { updateOnly?: false, addOnly?: true, returnChanged?: boolean, increment: true };

type SortedSetCombineOptions = { weights?: number[], aggregate?: 'sum' | 'min' | 'max' };

type SortedSetLimit = { offset: number, count: number };

export type SortedSetBlockingPopResult = { originSet: string, entry: SortedSetEntry };

enum SortedSetReplyOrder {
  ScoresFirst,
  MembersFirst
}

export class TypedRedis {
  private readonly redis: Redis | RedisPipelineWrapper;

  private readonly messageObservable: Observable<Message>;

  get message$(): Observable<Message> {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('subscribe not supported in pipeline and transaction');
    }

    return this.messageObservable;
  }

  constructor(redis: Redis | RedisPipelineWrapper) {
    this.redis = redis;

    this.messageObservable = new Observable<Message>((subscriber) => {
      const listener = (channel: string, message: string): void => subscriber.next({ channel, message });
      (this.redis as Redis).addListener('message', listener);
      subscriber.add(() => (this.redis as Redis).removeListener('message', listener));
    }).pipe(share());
  }

  duplicate(): TypedRedis {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('not supported for RedisPipelineWrapper');
    }

    const duplicate = this.redis.duplicate();
    return new TypedRedis(duplicate);
  }

  disconnect(): void {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('not supported for RedisPipelineWrapper');
    }

    this.redis.disconnect();
  }

  async quit(): Promise<string> {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('not supported for RedisPipelineWrapper');
    }

    return this.redis.quit();
  }

  pipeline(): TypedRedisPipeline {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('already in pipeline mode');
    }

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new TypedRedisPipeline(this.redis, false);
  }

  transaction(): TypedRedisPipeline {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('already in transaction mode');
    }

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new TypedRedisPipeline(this.redis, true);
  }

  defineCommand(name: string, definition: { numberOfKeys?: number, lua?: string }): void {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('not supported for RedisPipelineWrapper');
    }

    this.redis.defineCommand(name, definition);
  }

  async scriptLoad(script: string): Promise<string> {
    return this.redis.script('LOAD', script) as Promise<string>;
  }

  async evaluate<T>(script: string, keys: string[], args: string[]): Promise<T> {
    return this.redis.eval(script, keys.length, ...keys, ...args) as Promise<T>;
  }

  async evaluateSha<T>(sha: string, keys: string[], args: string[]): Promise<T> {
    return this.redis.evalsha(sha, keys.length.toString(), ...keys, ...args) as Promise<T>;
  }

  async get(key: string): Promise<string | undefined> {
    const reply = await this.redis.get(key, undefined as any);
    return reply == undefined ? undefined : reply;
  }

  async set(key: string, value: string, options: ({ expireType: ExpireType, expireValue: number } | { expireType?: undefined, expireValue?: undefined }) & { updateType?: UpdateType } = {}): Promise<boolean> {
    const args = [
      ...conditional(options.expireType != undefined, [options.expireType as string, (options.expireValue as number).toString()]),
      ...conditional(options.updateType != undefined, options.updateType as string)
    ];

    const reply = await this.redis.set(key, value, ...args);
    return reply != undefined;
  }

  async exists(...keys: string[]): Promise<number> {
    return this.redis.exists(...keys);
  }

  async hExists(key: string, field: string): Promise<boolean> {
    const exists = await this.redis.hexists(key, field);
    return exists == 1;
  }

  async hGet(key: string, field: string, throwIfNotFound?: true): Promise<string>;
  async hGet(key: string, field: string, throwIfNotFound: boolean): Promise<string | undefined>;
  async hGet(key: string, field: string, throwIfNotFound: boolean = true): Promise<string | undefined> {
    const result = await this.redis.hget(key, field);

    if (result == undefined) {
      if (throwIfNotFound) {
        throw new Error(`key '${key}' or field '${field}' not found`);
      }

      return undefined;
    }

    return result;
  }

  async hSet(key: string, field: string, value: string): Promise<0 | 1> {
    return this.redis.hset(key, field, value);
  }

  async hDelete(key: string, fields: string[]): Promise<number> {
    return this.redis.hdel(key, ...fields);
  }

  async hGetAll(key: string): Promise<StringMap<string | number>> {
    return this.redis.hgetall(key);
  }

  async hIncrease(key: string, field: string, increment: number, asFloat: boolean): Promise<number> {
    return asFloat
      ? this.redis.hincrbyfloat(key, field, increment)
      : this.redis.hincrby(key, field, increment);
  }

  async hFields(key: string): Promise<string[]> {
    return this.redis.hkeys(key);
  }

  async hValues(key: string): Promise<string[]> {
    return this.redis.hvals(key);
  }

  async hLength(key: string): Promise<number> {
    return this.redis.hlen(key);
  }

  async hGetMany(key: string, fields: string[], throwIfNotFound?: true): Promise<Map<string, string>>;
  async hGetMany(key: string, fields: string[], throwIfNotFound: boolean): Promise<Map<string, string | undefined>>;
  async hGetMany(key: string, fields: string[], throwIfNotFound: boolean = true): Promise<Map<string, string | undefined>> {
    const reply = await this.redis.hmget(key, ...fields);
    const result = new Map<string, string | undefined>();

    for (let i = 0; i < fields.length; i++) {
      const value = reply[i];

      if (value != undefined) {
        result.set(fields[i], value);
      }
      else if (throwIfNotFound) {
        throw new Error(`field ${fields[i]} not found`);
      }
    }

    return result;
  }

  async hSetMany(key: string, values: StringMap<string> | [string, string][]): Promise<void> {
    const args = Array.isArray(values)
      ? values.flat()
      : Object.entries(values).flat();

    await this.redis.hmset(key, ...args);
  }

  async * hScan(key: string, options: { pattern?: string, count?: number } = {}): AsyncIterableIterator<{ field: string, value: string }> {
    const cursor = this.getCursor(key, 'hscan', options);

    for await (const [field, value] of cursor) {
      yield { field, value };
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.redis.publish(channel, message);
  }

  async subscribe(...channels: string[]): Promise<number> {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('subscribe not supported in pipeline and transaction');
    }

    return this.redis.subscribe(...channels);
  }

  async unsubscribe(...channels: string[]): Promise<number> {
    if (this.redis instanceof RedisPipelineWrapper) {
      throw new Error('unsubscribe not supported in pipeline and transaction');
    }

    return this.redis.unsubscribe(...channels);
  }

  async zAdd(key: string, entries: SortedSetEntry | SortedSetEntry[], { updateOnly = false, addOnly = false, returnChanged = false, increment = false }: SortedSetAddOptions | SortedSetAddIncrementOptions = {}): Promise<number> {
    const args: string[] = [...conditional(updateOnly, 'XX'), ...conditional(addOnly, 'NX'), ...conditional(returnChanged, 'CH'), ...conditional(increment, 'INCR')];
    const entriesArgs = toArray(entries).flatMap(({ score, member }) => [score.toString(), member]);

    const reply = await this.redis.zadd(key, ...args, ...entriesArgs);

    return (typeof reply == 'string')
      ? parseFloat(reply)
      : reply;
  }

  async zBlockPopMax(key: string, timeout: number): Promise<undefined | SortedSetBlockingPopResult>;
  async zBlockPopMax(key: string, sets: string[], timeout: number): Promise<undefined | SortedSetBlockingPopResult>;
  async zBlockPopMax(key: string, setsOrTimeout: string[] | number, timeoutOrUndefined?: number): Promise<undefined | SortedSetBlockingPopResult> {
    return this.zBlockPop(key, 'bzpopmax', setsOrTimeout, timeoutOrUndefined);
  }

  async zBlockPopMin(key: string, timeout: number): Promise<undefined | SortedSetBlockingPopResult>;
  async zBlockPopMin(key: string, sets: string[], timeout: number): Promise<undefined | SortedSetBlockingPopResult>;
  async zBlockPopMin(key: string, setsOrTimeout: string[] | number, timeoutOrUndefined?: number): Promise<undefined | SortedSetBlockingPopResult> {
    return this.zBlockPop(key, 'bzpopmin', setsOrTimeout, timeoutOrUndefined);
  }

  async zCard(key: string): Promise<number> {
    return this.redis.zcard(key);
  }

  async zCount(key: string, min: number, max: number): Promise<number> {
    return this.redis.zcount(key, min, max);
  }

  async zIncrement(key: string, member: string, amount: number): Promise<number> {
    const reply = await this.redis.zincrby(key, amount, member);
    return parseFloat(reply);
  }

  async zIntersect(key: string, destionation: string, sets: string[], options: SortedSetCombineOptions): Promise<number> {
    return this.zCombine(key, 'zinterstore', destionation, sets, options);
  }

  async zLexicalCount(key: string, min: string, max: string): Promise<number> {
    return this.redis.zlexcount(key, min, max);
  }

  async zPopMin(key: string, count: number): Promise<SortedSetEntry[]> {
    const reply = await this.redis.zpopmin(key, count);
    return zParseEntriesReply(reply, SortedSetReplyOrder.ScoresFirst);
  }

  async zPopMax(key: string, count: number): Promise<SortedSetEntry[]> {
    const reply = await this.redis.zpopmax(key, count);
    return zParseEntriesReply(reply, SortedSetReplyOrder.ScoresFirst);
  }

  async zRange(key: string, start: number, stop: number, withScores: false, reverse?: boolean): Promise<string[]>;
  async zRange(key: string, start: number, stop: number, withScores: true, reverse?: boolean): Promise<| SortedSetEntry[]>;
  async zRange(key: string, start: number, stop: number, withScores: boolean, reverse: boolean = false): Promise<string[] | SortedSetEntry[]> {
    const command = reverse ? 'zrevrange' : 'zrange';
    const reply = withScores
      ? await this.redis[command](key, start, stop, 'WITHSCORES')
      : await this.redis[command](key, start, stop);

    const result = withScores
      ? zParseEntriesReply(reply, SortedSetReplyOrder.MembersFirst)
      : reply;

    return result;
  }

  async zRangeByLex(key: string, min: string, max: string, { reverse = false, limit }: { reverse?: boolean, limit?: SortedSetLimit } = {}): Promise<string[]> {
    const command = reverse ? 'zrevrangebylex' : 'zrangebylex';

    return (limit == undefined)
      ? this.redis[command](key, min, max)
      : this.redis[command](key, min, max, 'LIMIT', limit.offset, limit.count);
  }

  async zRangeByScore(key: string, min: number, max: number, withScores: false, options?: { reverse?: boolean, limit?: SortedSetLimit }): Promise<string[]>;
  async zRangeByScore(key: string, min: number, max: number, withScores: true, options?: { reverse?: boolean, limit?: SortedSetLimit }): Promise<SortedSetEntry[]>;
  async zRangeByScore(key: string, min: number, max: number, withScores: boolean, { reverse = false, limit }: { reverse?: boolean, limit?: SortedSetLimit } = {}): Promise<string[] | SortedSetEntry[]> {
    const command = reverse ? 'zrevrangebyscore' : 'zrangebyscore';
    const args = [
      ...conditional(withScores, 'WITHSCORES'),
      ...conditional(limit != undefined, ['LIMIT', (limit as SortedSetLimit).offset.toString(), (limit as SortedSetLimit).count.toString()])
    ];

    const reply = await (this.redis[command](key, min, max, ...(args as any)));

    const result = withScores
      ? zParseEntriesReply(reply, SortedSetReplyOrder.MembersFirst)
      : reply;

    // eslint-disable-next-line no-self-compare, @typescript-eslint/no-unnecessary-condition, curly
    if (1 == 1) throw new Error('check if SortedSetReplyOrder is correct');

    return result;
  }

  async zRank(key: string, member: string, reverse: boolean = false): Promise<number | undefined> {
    const command = reverse ? 'zrevrank' : 'zrank';
    const reply = await this.redis[command](key, member);

    if (reply == undefined) {
      return undefined;
    }

    return reply;
  }

  async zRemove(key: string, members: string[]): Promise<number> {
    return this.redis.zrem(key, ...members);
  }

  async zRemoveRangeByLex(key: string, min: string, max: string): Promise<number> {
    return this.redis.zremrangebylex(key, min, max);
  }

  async zRemoveRangeByRank(key: string, start: number, stop: number): Promise<number> {
    return this.redis.zremrangebyrank(key, start, stop);
  }

  async zRemoveRangeByScore(key: string, min: number, max: number): Promise<number> {
    return this.redis.zremrangebyscore(key, min, max);
  }

  async * zScan(key: string, options: { pattern?: string, count?: number } = {}): AsyncIterableIterator<SortedSetEntry> {
    const cursor = this.getCursor(key, 'zscan', options);

    for await (const [member, scoreString] of cursor) {
      const score = parseFloat(scoreString);
      yield { score, member };
    }
  }

  async zScore(key: string, member: string): Promise<number> {
    const reply = await this.redis.zscore(key, member);
    const score = parseFloat(reply);

    return score;
  }

  async zUnion(key: string, destionation: string, sets: string[], options: SortedSetCombineOptions): Promise<number> {
    return this.zCombine(key, 'zunionstore', destionation, sets, options);
  }

  async rPush(key: string, values: string[]): Promise<number> {
    return this.redis.rpush(key, ...values);
  }

  async lPush(key: string, values: string[]): Promise<number> {
    return this.redis.lpush(key, ...values);
  }

  private async zBlockPop(key: string, type: 'bzpopmin' | 'bzpopmax', setsOrTimeout: string[] | number, timeoutOrUndefined?: number): Promise<undefined | SortedSetBlockingPopResult> {
    const sets = (typeof setsOrTimeout == 'number') ? [key] : [key, ...setsOrTimeout];
    const timeout = (typeof setsOrTimeout == 'number') ? setsOrTimeout : timeoutOrUndefined as number;

    const reply = await this.redis[type](sets, timeout);

    if (reply == undefined) {
      return undefined;
    }

    const [originSet, scoreString, member] = reply;
    const entry: SortedSetEntry = {
      score: parseFloat(scoreString),
      member
    };

    return { originSet, entry };
  }

  private async zCombine(key: string, type: 'zunionstore' | 'zinterstore', destination: string, sets: string[], options: SortedSetCombineOptions): Promise<number> {
    const args = [
      ...conditional(options.weights != undefined, ['WEIGHTS', ...(options.weights as number[]).map((value) => value.toString())]),
      ...conditional(options.aggregate != undefined, ['AGGREGATE', (options.aggregate as string).toUpperCase()])
    ];

    return this.redis[type](destination, sets.length, key, ...sets, ...args);
  }

  private async * getCursor<T extends ScanType>(key: string, type: T, { pattern, count }: { pattern?: string, count?: number } = {}): AsyncIterableIterator<ScanReturnType<T>> {
    const args = [...conditional(pattern != undefined, ['PATTERN', pattern]), ...conditional(count != undefined, ['COUNT', count])];

    let cursor = 0;

    do {
      const [newCursor, entries] = await ((this.redis[type] as (key: string, cursor: number, ...args: any[]) => any)(key, cursor, ...args) as Promise<[string, ScanReturnType<T>[]]>);
      cursor = parseInt(newCursor, 10);

      yield* entries;
    }
    while (cursor != 0);
  }
}

function zParseEntriesReply(reply: string[], order: SortedSetReplyOrder): SortedSetEntry[] {
  const entries: SortedSetEntry[] = [];

  switch (order) {
    case SortedSetReplyOrder.ScoresFirst:
      for (let i = 0; i < reply.length; i++) {
        const score = parseFloat(reply[i]);
        const member = reply[i + 1];

        entries.push({ score, member });
      }
      break;

    case SortedSetReplyOrder.MembersFirst:
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

export class TypedRedisPipeline extends TypedRedis {
  private readonly pipelineWrapper: RedisPipelineWrapper;

  constructor(redis: Redis, transaction: boolean) {
    const transactionWrapper = new RedisPipelineWrapper(redis, transaction);

    super(transactionWrapper);

    this.pipelineWrapper = transactionWrapper;
  }

  async discard(): Promise<void> {
    return this.pipelineWrapper.discard();
  }

  async execute(): Promise<void> {
    const replies = await this.pipelineWrapper.execute();

    for (const [error] of replies) {
      if (error != undefined) {
        throw error;
      }
    }
  }
}
