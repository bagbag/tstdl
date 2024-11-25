import type { Provider, ProviderToken } from '@angular/core';
import { Injector } from '@angular/core';
import type { Injector as TstdlInjector } from '@tstdl/base/injector';

export declare abstract class R3Injector extends Injector {
  records: R3InjectorRecordsMap;
  processProvider(provider: Provider): void;
}

export type R3InjectorRecordsMap = Map<ProviderToken<any>, any>;

export class WrappedR3InjectorRecordsMap implements R3InjectorRecordsMap {
  readonly #injector: TstdlInjector;

  #processingProvider = false;

  private readonly r3Injector: R3Injector;
  private readonly records: R3InjectorRecordsMap;

  get size(): number {
    return this.records.size;
  }

  get [Symbol.toStringTag](): string {
    return this.records[Symbol.toStringTag];
  }

  constructor(injector: TstdlInjector, r3Injector: R3Injector, records: R3InjectorRecordsMap) {
    this.#injector = injector;
    this.r3Injector = r3Injector;
    this.records = records;
  }

  static wrap(injector: TstdlInjector, r3Injector: R3Injector): void {
    r3Injector.records = new WrappedR3InjectorRecordsMap(injector, r3Injector, r3Injector.records);
  }

  clear(): void {
    this.records.clear();
  }

  delete(key: ProviderToken<any>): boolean {
    return this.records.delete(key);
  }

  forEach(callbackfn: (value: any, key: ProviderToken<any>, map: R3InjectorRecordsMap) => void, thisArg?: any): void {
    const _this = this; // eslint-disable-line consistent-this, @typescript-eslint/no-this-alias

    function callback(value: any, key: ProviderToken<any>): void {
      callbackfn(value, key, _this);
    }

    this.records.forEach(callback, thisArg);
  }

  get(key: ProviderToken<any>): any {
    this.addIfPossible(key);
    return this.records.get(key);
  }

  has(key: ProviderToken<any>): boolean {
    this.addIfPossible(key);
    return this.records.has(key);
  }

  set(key: ProviderToken<any>, value: any): this {
    this.records.set(key, value);
    return this;
  }

  entries(): MapIterator<[ProviderToken<any>, any]> {
    return this.records.entries();
  }

  keys(): MapIterator<ProviderToken<any>> {
    return this.records.keys();
  }

  values(): MapIterator<any> {
    return this.records.values();
  }

  [Symbol.iterator](): MapIterator<[ProviderToken<any>, any]> {
    return this.records[Symbol.iterator]();
  }

  private addIfPossible(key: ProviderToken<any>): void {
    if (this.#processingProvider) {
      return;
    }

    try {
      this.#processingProvider = true;

      if (!this.records.has(key) && this.#injector.hasRegistration(key as any)) {
        this.r3Injector.processProvider({ provide: key, useFactory: (): any => this.#injector.resolve(key as any) });
      }
    }
    finally {
      this.#processingProvider = false;
    }
  }
}
