import { Redis, Pipeline } from 'ioredis';

interface Commands {
  bzpopmax(...keys: string[], timeout: number): Promise<null | string[]>;

  bzpopmin(...keys: string[], timeout: number): Promise<null | string[]>;

  zlexcount(key: string, min: string, max: string): Promise<number>;

  zpopmax(key: string, count?: number): Promise<string[]>;

  zpopmin(key: string, count?: number): Promise<string[]>;

  zrangebylex(key: string, min: string, max: string, limit: 'LIMIT', offset: number, count: number): Promise<string[]>;
  zrangebylex(key: string, min: string, max: string): Promise<string[]>;

  zremrangebylex(key: string, min: string, max: string): Promise<number>;

  zrevrangebylex(key: string, max: string, min: string, limit: 'LIMIT', offset: number, count: number): Promise<string[]>;
  zrevrangebylex(key: string, max: string, min: string): Promise<string[]>;

  /* zscore(key: string, member: string): Promise<number>;

   zrange(key: string, start: number, stop: number): Promise<string[]>;
   zrange(key: string, start: number, stop: number, withScores: 'WITHSCORES'): Promise<(string | number)[]>;

   zrevrange(key: string, start: number, stop: number): Promise<string[]>;
   zrevrange(key: string, start: number, stop: number, withScores: 'WITHSCORES'): Promise<(string | number)[]>;

   zrangebyscore(key: string, min: number, max: number): Promise<string[]>;
   zrangebyscore(key: string, min: number, max: number, withScores: 'WITHSCORES'): Promise<(string | number)[]>;
   zrangebyscore(key: string, min: number, max: number, limit: 'LIMIT', offset: number, count: number): Promise<string[]>;
   zrangebyscore(key: string, min: number, max: number, withScores: 'WITHSCORES', limit: 'LIMIT', offset: number, count: number): Promise<(string | number)[]>;

   zrevrangebyscore(key: string, max: number, min: number): Promise<string[]>;
   zrevrangebyscore(key: string, max: number, min: number, withScores: 'WITHSCORES'): Promise<(string | number)[]>;
   zrevrangebyscore(key: string, max: number, min: number, limit: 'LIMIT', offset: number, count: number): Promise<string[]>;
   zrevrangebyscore(key: string, max: number, min: number, withScores: 'WITHSCORES', limit: 'LIMIT', offset: number, count: number): Promise<(string | number)[]>;

   zrank(key: string, member: string): Promise<number | null>;

   zrevrank(key: string, member: string): Promise<number | null>;

   zrem(key: string, ...members: string[]): Promise<number>;

   zremrangebyrank(key: string, start: number, stop: number): Promise<void>;

   zremrangebyscore(key: string, min: number, max: number): Promise<void>;

   zuinionstore(destination: string, numKeys: number, ...args: (string | number)[]): Promise<number>;

   zinterstore(destination: string, numKey: number, ...args: (string | number)[]): Promise<number>;

   */
}

(null as Commands).zuinionstore('asd', 5, '', 'adasd', 5, 3, 3)

declare module 'ioredis' {
  declare interface Redis extends Commands {
  }

  declare interface Pipeline extends Commands {
  }
}
