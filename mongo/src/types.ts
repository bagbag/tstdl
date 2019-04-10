import { IndexSpecification } from 'mongodb';
import { Omit } from '@common-ts/base/types';

export type TypedIndexSpecification<T> = Omit<IndexSpecification, 'key'> & {
  key: { [P in keyof T]: 1 | -1 | 'text' | 'hashed' }
};
