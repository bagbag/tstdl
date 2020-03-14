import { Omit } from '@tstdl/base/types';
import { Readable, ReadableOptions } from 'stream';
import { Data, NonObjectMode, NonObjectModeTypes } from './stream-helper-types';


interface TypedReadableOverrides<T> {
  read(size?: T extends NonObjectMode ? number : undefined): Data<T> | null;
  push<U extends (T extends NonObjectMode ? NonObjectModeTypes : T)>(chunk: U | null, encoding?: T extends NonObjectMode ? U extends string ? string : never : never): boolean;
  unshift(chunk: Data<T>): void;

  _read(size: number): void;
  _destroy(error: Error | null, callback: (error?: Error | null) => void): void;

  addListener(event: 'data', listener: (chunk: Data<T>) => void): TypedReadable<T>;
  emit(event: 'data', chunk: Data<T>): boolean;
  on(event: 'data', listener: (chunk: Data<T>) => void): TypedReadable<T>;
  once(event: 'data', listener: (chunk: Data<T>) => void): TypedReadable<T>;
  prependListener(event: 'data', listener: (chunk: Data<T>) => void): TypedReadable<T>;
  prependOnceListener(event: 'data', listener: (chunk: Data<T>) => void): TypedReadable<T>;
  removeListener(event: 'data', listener: (chunk: Data<T>) => void): TypedReadable<T>;

  [Symbol.asyncIterator](): AsyncIterableIterator<Data<T>>;

  addListener(event: 'close', listener: () => void): TypedReadable<T>;
  addListener(event: 'end', listener: () => void): TypedReadable<T>;
  addListener(event: 'readable', listener: () => void): TypedReadable<T>;
  addListener(event: 'error', listener: (err: Error) => void): TypedReadable<T>;
  addListener(event: string | symbol, listener: (...args: any[]) => void): TypedReadable<T>;

  emit(event: 'close'): boolean;
  emit(event: 'end'): boolean;
  emit(event: 'readable'): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;

  on(event: 'close', listener: () => void): TypedReadable<T>;
  on(event: 'end', listener: () => void): TypedReadable<T>;
  on(event: 'readable', listener: () => void): TypedReadable<T>;
  on(event: 'error', listener: (err: Error) => void): TypedReadable<T>;
  on(event: string | symbol, listener: (...args: any[]) => void): TypedReadable<T>;

  once(event: 'close', listener: () => void): TypedReadable<T>;
  once(event: 'end', listener: () => void): TypedReadable<T>;
  once(event: 'readable', listener: () => void): TypedReadable<T>;
  once(event: 'error', listener: (err: Error) => void): TypedReadable<T>;
  once(event: string | symbol, listener: (...args: any[]) => void): TypedReadable<T>;

  prependListener(event: 'close', listener: () => void): TypedReadable<T>;
  prependListener(event: 'end', listener: () => void): TypedReadable<T>;
  prependListener(event: 'readable', listener: () => void): TypedReadable<T>;
  prependListener(event: 'error', listener: (err: Error) => void): TypedReadable<T>;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): TypedReadable<T>;

  prependOnceListener(event: 'close', listener: () => void): TypedReadable<T>;
  prependOnceListener(event: 'end', listener: () => void): TypedReadable<T>;
  prependOnceListener(event: 'readable', listener: () => void): TypedReadable<T>;
  prependOnceListener(event: 'error', listener: (err: Error) => void): TypedReadable<T>;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): TypedReadable<T>;

  removeListener(event: 'close', listener: () => void): TypedReadable<T>;
  removeListener(event: 'end', listener: () => void): TypedReadable<T>;
  removeListener(event: 'readable', listener: () => void): TypedReadable<T>;
  removeListener(event: 'error', listener: (err: Error) => void): TypedReadable<T>;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): TypedReadable<T>;
}

interface TypedReadableConstructor {
  new <T = NonObjectMode>(options?: ReadableOptions): TypedReadable<T>;
}

export type TypedReadable<T = NonObjectMode> = Omit<Readable, keyof TypedReadableOverrides<T>> & TypedReadableOverrides<T>;

export const TypedReadable = Readable as TypedReadableConstructor;
