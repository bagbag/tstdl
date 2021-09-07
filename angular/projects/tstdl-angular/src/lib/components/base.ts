import type { OnChanges, OnDestroy, SimpleChange, SimpleChanges } from '@angular/core';
import { Component } from '@angular/core';
import type { TypedOmit } from '@tstdl/base/cjs/types';
import type { Observable } from 'rxjs';
import { defer, filter, map, startWith, Subject } from 'rxjs';

export type TypedSimpleChange<T> = TypedOmit<SimpleChange, 'previousValue' | 'currentValue'> & {
  previousValue: T,
  currentValue: T
};

type ParentComponentProperties<ParentComponent> = Exclude<keyof ParentComponent, keyof ComponentBase>;

@Component({ template: '' })
export class ComponentBase<ParentComponent = any> implements OnChanges, OnDestroy {
  private readonly changesSubject: Subject<SimpleChanges>;
  private readonly destroySubject: Subject<void>;

  readonly changes$: Observable<SimpleChanges>;
  readonly destroy$: Observable<void>;

  constructor() {
    this.changesSubject = new Subject();
    this.destroySubject = new Subject();

    this.changes$ = this.changesSubject.asObservable();
    this.destroy$ = this.destroySubject.asObservable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.changesSubject.next(changes);
  }

  ngOnDestroy(): void {
    this.changesSubject.complete();
    this.destroySubject.next();
    this.destroySubject.complete();
  }

  observeChanges<Property extends ParentComponentProperties<ParentComponent>>(property: Property): Observable<TypedSimpleChange<ParentComponent[Property]>> {
    return this.changes$.pipe(
      filter((changes) => Object.prototype.hasOwnProperty.call(changes, property)),
      map((changes) => changes[property as string]!)
    );
  }

  observe<Property extends ParentComponentProperties<ParentComponent>>(property: Property): Observable<ParentComponent[Property]> {
    return defer(() => this.observeChanges(property).pipe(
      map((change) => change.currentValue),
      startWith((this as unknown as ParentComponent)[property])
    ));
  }
}
