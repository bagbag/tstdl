import type { Record } from '#/types.js';

export declare const tag: unique symbol;
export declare const type: unique symbol;

export type TagContainer<Type, Token> = { readonly [tag]?: Token, readonly [type]?: Type };

export type Tag<Type, Token extends PropertyKey, TagMetadata> = TagContainer<Type, Record<Token, TagMetadata>>;

export type HasTag<T, Token = unknown> = T extends TagContainer<unknown, Token> ? true : false;

export type Tagged<Type = unknown, TagName extends PropertyKey = PropertyKey, TagMetadata = unknown> = Type & Tag<Type, TagName, TagMetadata>;

export type GetTagMetadata<Type extends Tag<unknown, TagName, unknown>, TagName extends PropertyKey> = NonNullable<Type[typeof tag]>[TagName];

export type UnwrapTagged<TaggedType extends Tag<unknown, PropertyKey, any>> = TaggedType extends Tagged<infer Type, PropertyKey, any> ? Type : never;

export type Untagged<T> = T extends Tagged ? UnwrapTagged<T> : T;

export type UntaggedDeep<T> = T extends Tagged
  ? UnwrapTagged<T>
  : T extends readonly (infer U)[]
  ? UntaggedDeep<U>[]
  : T extends Record
  ? { [P in keyof T]: UntaggedDeep<T[P]> }
  : Untagged<T>;
