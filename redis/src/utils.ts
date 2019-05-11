export function conditional<T, U>(predicate: boolean, whenTrue: T | T[]): [T] | [];
export function conditional<T, U>(predicate: boolean, whenTrue: T | T[], whenFalse: U | U[]): [T] | [U];
export function conditional<T, U>(predicate: boolean, whenTrue: T | T[], whenFalse?: U | U[] | undefined): T[] | U[] | [] {
  return predicate
    ? Array.isArray(whenTrue) ? whenTrue : [whenTrue]
    : whenFalse != undefined
      ? Array.isArray(whenFalse) ? whenFalse : [whenFalse]
      : [];
}
