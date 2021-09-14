import type { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges } from '@angular/core';
import { Injectable } from '@angular/core';
import type { TypedOmit } from '@tstdl/base/cjs/types';
import type { ReadonlyCancellationToken } from '@tstdl/base/cjs/utils';
import { CancellationToken } from '@tstdl/base/cjs/utils';
import type { Observable } from 'rxjs';
import { defer, filter, map, startWith, Subject } from 'rxjs';

export type TypedSimpleChange<T> = TypedOmit<SimpleChange, 'previousValue' | 'currentValue'> & {
  previousValue: T,
  currentValue: T
};

type ParentProperties<Parent> = Exclude<keyof Parent, keyof LifecycleUtils>;

@Injectable()
export class LifecycleUtils<Parent = any> implements OnInit, OnChanges, OnDestroy, AfterViewInit, AfterContentInit, AfterViewChecked, AfterContentChecked {
  private readonly initSubject: Subject<void>;
  private readonly destroySubject: Subject<void>;
  private readonly changesSubject: Subject<SimpleChanges>;
  private readonly viewInitSubject: Subject<void>;
  private readonly contentInitSubject: Subject<void>;
  private readonly viewCheckedSubject: Subject<void>;
  private readonly contentCheckedSubject: Subject<void>;

  readonly changes$: Observable<SimpleChanges>;
  readonly destroy$: Observable<void>;
  readonly viewInit$: Observable<void>;
  readonly contentInit$: Observable<void>;
  readonly viewChecked$: Observable<void>;
  readonly contentChecked$: Observable<void>;

  readonly destroyToken: ReadonlyCancellationToken;

  constructor() {
    this.initSubject = new Subject();
    this.destroySubject = new Subject();
    this.changesSubject = new Subject();
    this.viewInitSubject = new Subject();
    this.contentInitSubject = new Subject();
    this.viewCheckedSubject = new Subject();
    this.contentCheckedSubject = new Subject();

    this.changes$ = this.changesSubject.asObservable();
    this.destroy$ = this.destroySubject.asObservable();
    this.viewInit$ = this.viewInitSubject.asObservable();
    this.contentInit$ = this.contentInitSubject.asObservable();
    this.viewChecked$ = this.viewCheckedSubject.asObservable();
    this.contentChecked$ = this.contentCheckedSubject.asObservable();

    this.destroyToken = CancellationToken.fromObservable(this.destroySubject).readonly;

    this.destroy$.subscribe(() => {
      this.initSubject.complete();
      this.destroySubject.complete();
      this.changesSubject.complete();
      this.viewInitSubject.complete();
      this.contentInitSubject.complete();
      this.viewCheckedSubject.complete();
      this.contentCheckedSubject.complete();
    });
  }

  ngOnInit(): void {
    this.initSubject.next();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.changesSubject.next(changes);
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
  }

  ngAfterViewInit(): void {
    this.viewInitSubject.next();
  }

  ngAfterContentInit(): void {
    this.contentInitSubject.next();
  }

  ngAfterViewChecked(): void {
    this.viewCheckedSubject.next();
  }

  ngAfterContentChecked(): void {
    this.contentCheckedSubject.next();
  }

  observeChanges<Property extends ParentProperties<Parent>>(property: Property): Observable<TypedSimpleChange<Parent[Property]>> {
    return this.changes$.pipe(
      filter((changes) => Object.prototype.hasOwnProperty.call(changes, property)),
      map((changes) => changes[property as string]!)
    );
  }

  observe<Property extends ParentProperties<Parent>>(property: Property): Observable<Parent[Property]> {
    return defer(() => this.observeChanges(property).pipe(
      map((change) => change.currentValue),
      startWith((this as unknown as Parent)[property])
    ));
  }
}
