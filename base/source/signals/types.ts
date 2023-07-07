import type { Signal } from './api.js';

export type UnwrappedSignal<T extends Signal<unknown>> = T extends Signal<infer U> ? U : never;
export type UnwrappedSignals<T extends readonly Signal<unknown>[]> = { [P in keyof T]: UnwrappedSignal<T[P]> };
