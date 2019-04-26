export function conditional<T, U>(predicate: boolean, whenTrue: T): [T] | [];
export function conditional<T, U>(predicate: boolean, whenTrue: T, whenFalse: U): [T] | [U];
export function conditional<T, U>(predicate: boolean, whenTrue: T, whenFalse?: U | undefined): [T] | [U] | [] {
  return predicate
    ? [whenTrue]
    : whenFalse != undefined
      ? [whenFalse]
      : [];
}
