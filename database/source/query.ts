export type Query<T> = {

};

export type NotQuery<T> = {
  $not: Query<T>
};

export type AndQuery<T> = {
  $and: Query<T>[]
};

export type OrQuery<T> = {
  $or: Query<T>[]
};

export type EqualsQuery<T> = {
  $eq: T
};

export type NotEqualsQuery<T> = {
  $neq: T
};

export type OneOfQuery<T> = {
  $oneOf: {}
}

type A = {
  value: number,
  foo: {
    bar: {
      value: string,
      baz: {
        value: boolean
      }
    }
  }
};

type Keys<T, K extends keyof T = keyof T> = T extends Record<any, any> ? (K | `${K}.${Keys<T[K], keyof T[K]>}`) : K;

const k: Keys<A, keyof A> = '';
