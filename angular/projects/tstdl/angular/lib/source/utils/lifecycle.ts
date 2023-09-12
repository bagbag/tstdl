import type { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges } from '@angular/core';
import { Injectable } from '@angular/core';
import type { CancellationSignal } from '@tstdl/base/cancellation';
import { CancellationToken } from '@tstdl/base/cancellation';
import type { TypedOmit } from '@tstdl/base/types';
import { isUndefined } from '@tstdl/base/utils';
import { hasOwnProperty } from '@tstdl/base/utils/object';
import type { Observable } from 'rxjs';
import { ReplaySubject, Subject, defer, filter, map, startWith, switchMap } from 'rxjs';

export type TypedSimpleChange<T> = TypedOmit<SimpleChange, 'previousValue' | 'currentValue'> & {
  previousValue: T,
  currentValue: T
};

type ParentProperties<Parent> = Exclude<keyof Parent, keyof LifecycleUtils>;

@Injectable()
export class LifecycleUtils<Parent = any> implements OnInit, OnChanges, OnDestroy, AfterViewInit, AfterContentInit, AfterViewChecked, AfterContentChecked {
  #destroyToken: CancellationToken | undefined;

  private readonly initSubject: Subject<void>;
  private readonly destroySubject: Subject<void>;
  private readonly changesSubject: Subject<SimpleChanges>;
  private readonly viewInitSubject: Subject<void>;
  private readonly contentInitSubject: Subject<void>;
  private readonly viewCheckedSubject: Subject<void>;
  private readonly contentCheckedSubject: Subject<void>;
  private readonly ionViewWillEnterSubject: Subject<void>;
  private readonly ionViewDidEnterSubject: Subject<void>;
  private readonly ionViewWillLeaveSubject: Subject<void>;
  private readonly ionViewDidLeaveSubject: Subject<void>;

  /**
   * emits on `ngOnInit`. Also emits if subscribed afterwards
   * @see {@link OnInit}
   */
  readonly init$: Observable<void>;

  /**
   * emits on `ngOnChanges`
   * @see {@link OnChanges}
   */
  readonly changes$: Observable<SimpleChanges>;

  /**
   * emits on `ngOnDestroy`. Also emits if subscribed afterwards
   * @see {@link OnDestroy}
   */
  readonly destroy$: Observable<void>;

  /**
   * emits on `ngAfterViewInit`. Also emits if subscribed afterwards
   * @see {@link AfterViewInit}
   */
  readonly viewInit$: Observable<void>;

  /**
   * emits on `ngAfterContentInit`. Also emits if subscribed afterwards
   * @see {@link AfterContentInit}
   */
  readonly contentInit$: Observable<void>;

  /**
   * emits on `ngAfterViewChecked`
   * @see {@link AfterViewChecked}
   */
  readonly viewChecked$: Observable<void>;

  /**
   * emits on `ngAfterContentChecked`
   * @see {@link AfterContentChecked}
   */
  readonly contentChecked$: Observable<void>;

  /**
   * emits on `ionViewWillEnter`
   */
  readonly ionViewWillEnter$: Observable<void>;

  /**
   * emits on `ionViewDidEnter`
   */
  readonly ionViewDidEnter$: Observable<void>;

  /**
   * emits on `ionViewWillLeave`
   */
  readonly ionViewWillLeave$: Observable<void>;

  /**
   * emits on `ionViewDidLeave`
   */
  readonly ionViewDidLeave$: Observable<void>;

  /**
   * {@link CancellationToken} bound to {@link destroy$}
   */
  get destroySignal(): CancellationSignal {
    if (isUndefined(this.#destroyToken)) {
      this.#destroyToken = CancellationToken.from(this.destroySubject);
    }

    return this.#destroyToken.signal;
  }

  // eslint-disable-next-line max-statements
  constructor() {
    this.initSubject = new ReplaySubject(1);
    this.destroySubject = new ReplaySubject(1);
    this.changesSubject = new Subject();
    this.viewInitSubject = new ReplaySubject(1);
    this.contentInitSubject = new ReplaySubject(1);
    this.viewCheckedSubject = new Subject();
    this.contentCheckedSubject = new Subject();
    this.ionViewWillEnterSubject = new Subject();
    this.ionViewDidEnterSubject = new Subject();
    this.ionViewWillLeaveSubject = new Subject();
    this.ionViewDidLeaveSubject = new Subject();

    this.init$ = this.initSubject.asObservable();
    this.changes$ = this.changesSubject.asObservable();
    this.destroy$ = this.destroySubject.asObservable();
    this.viewInit$ = this.viewInitSubject.asObservable();
    this.contentInit$ = this.contentInitSubject.asObservable();
    this.viewChecked$ = this.viewCheckedSubject.asObservable();
    this.contentChecked$ = this.contentCheckedSubject.asObservable();
    this.ionViewWillEnter$ = this.ionViewWillEnterSubject.asObservable();
    this.ionViewDidEnter$ = this.ionViewDidEnterSubject.asObservable();
    this.ionViewWillLeave$ = this.ionViewWillLeaveSubject.asObservable();
    this.ionViewDidLeave$ = this.ionViewDidLeaveSubject.asObservable();
  }

  ngOnInit(): void {
    this.initSubject.next();
    this.initSubject.complete();

    this.destroy$.subscribe(() => {
      this.changesSubject.complete();
      this.viewCheckedSubject.complete();
      this.contentCheckedSubject.complete();
      this.ionViewWillEnterSubject.complete();
      this.ionViewDidEnterSubject.complete();
      this.ionViewWillLeaveSubject.complete();
      this.ionViewDidLeaveSubject.complete();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.changesSubject.next(changes);
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
  }

  ngAfterViewInit(): void {
    this.viewInitSubject.next();
    this.viewInitSubject.complete();
  }

  ngAfterContentInit(): void {
    this.contentInitSubject.next();
    this.contentInitSubject.complete();
  }

  ngAfterViewChecked(): void {
    this.viewCheckedSubject.next();
  }

  ngAfterContentChecked(): void {
    this.contentCheckedSubject.next();
  }

  ionViewWillEnter(): void {
    this.ionViewWillEnterSubject.next();
  }

  ionViewDidEnter(): void {
    this.ionViewDidEnterSubject.next();
  }

  ionViewWillLeave(): void {
    this.ionViewWillLeaveSubject.next();
  }

  ionViewDidLeave(): void {
    this.ionViewDidLeaveSubject.next();
  }

  observeChanges<Property extends ParentProperties<Parent>>(property: Property): Observable<TypedSimpleChange<Parent[Property]>> {
    return this.changes$.pipe(
      filter((changes) => hasOwnProperty(changes, property as keyof SimpleChanges)),
      map((changes) => changes[property as string]!)
    );
  }

  observe<Property extends ParentProperties<Parent>>(property: Property): Observable<Parent[Property]> {
    return this.init$.pipe(
      switchMap(
        () => defer(
          () => this.observeChanges(property).pipe(
            map((change) => change.currentValue),
            startWith((this as unknown as Parent)[property])
          )
        )
      )
    );
  }
}
