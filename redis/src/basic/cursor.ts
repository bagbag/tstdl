import { Redis } from 'ioredis';
import { conditional } from './utils';

type ScanType = 'scan' | 'sscan' | 'hscan' | 'zscan';
type ScanReturnType<T extends ScanType> = {
  scan: string,
  sscan: string,
  hscan: [string, string],
  zscan: [string, string]
}[T];

export async function* getCursor<T extends ScanType>(redis: Redis, key: string, type: T, { pattern, count }: { pattern?: string, count?: number } = {}): AsyncIterableIterator<ScanReturnType<T>> {
  const args = [...conditional(pattern != undefined, ['PATTERN', pattern]), ...conditional(count != undefined, ['COUNT', count])];

  let cursor = 0;

  do {
    const [newCursor, entries] = await ((redis[type] as (key: string, cursor: number, ...args: any[]) => any)(key, cursor, ...args) as Promise<[string, ScanReturnType<T>[]]>);
    cursor = parseInt(newCursor);

    yield* entries;
  }
  while (cursor != 0);
}
