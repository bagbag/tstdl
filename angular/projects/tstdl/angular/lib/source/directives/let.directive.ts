import type { EmbeddedViewRef, OnDestroy } from '@angular/core';
import { ChangeDetectorRef, Directive, ErrorHandler, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { isAsyncIterable } from '@tstdl/base/utils/async-iterable-helpers/is-async-iterable';
import { isFunction, isUndefined } from '@tstdl/base/utils/type-guards';
import type { Observable, ReadableStreamLike, Subscription } from 'rxjs';
import { EMPTY, ReplaySubject, catchError, distinctUntilChanged, from, isObservable, of, switchMap, tap } from 'rxjs';
import type { Signal } from '../signals';
import { isSignal, toObservable } from '../signals';

export type LetContext<T> = {
  $implicit: LetOutput<T>,
  tslLet: LetOutput<T>,
  isComplete: boolean,
  hasError: boolean,
  error: any
};

type LetAsyncInput<T> =
  | Observable<T>
  | AsyncIterable<T>
  | PromiseLike<T>
  | ReadableStreamLike<T>
  | Signal<T>;

type LetInput<T> = LetAsyncInput<T> | T;

type LetOutput<T> = T extends LetAsyncInput<infer U> ? U : T;

@Directive({
  selector: '[tslLet]',
  standalone: true
})
export class LetDirective<T> implements OnDestroy {
  static ngTemplateGuard_tslLet: 'binding'; // eslint-disable-line @typescript-eslint/naming-convention

  private readonly template: TemplateRef<LetContext<T>>;
  private readonly viewContainer: ViewContainerRef;
  private readonly changeDetector: ChangeDetectorRef;
  private readonly inputSubject: ReplaySubject<LetInput<T>>;
  private readonly subscription: Subscription;
  private readonly viewContext: LetContext<T>;

  private embeddedView: EmbeddedViewRef<LetContext<T>> | undefined;

  @Input() // eslint-disable-line accessor-pairs
  set tslLet(observableInput: LetInput<T>) {
    this.inputSubject.next(observableInput);
  }

  constructor(template: TemplateRef<LetContext<T>>, viewContainer: ViewContainerRef, changeDetector: ChangeDetectorRef, errorHandler: ErrorHandler) {
    this.template = template;
    this.viewContainer = viewContainer;
    this.changeDetector = changeDetector;

    this.inputSubject = new ReplaySubject<LetInput<T>>(1);

    this.viewContext = {
      $implicit: undefined as any,
      tslLet: undefined as any,
      isComplete: false,
      hasError: false,
      error: undefined
    };

    this.subscription = this.inputSubject.pipe(
      switchMap((input) => {
        this.viewContext.isComplete = false;
        this.viewContext.hasError = false;
        this.viewContext.error = undefined;

        const observable = isAsyncInput(input) ?
          (isFunction(input) && isSignal(input))
            ? toObservable(input)
            : from(input)
          : of(input);

        return (observable as Observable<LetOutput<T>>).pipe(
          tap({
            next: (value) => this.next(value),
            error: (error) => this.error(error),
            complete: () => this.complete()
          }),
          catchError((error) => {
            errorHandler.handleError(error);
            return EMPTY;
          })
        );
      }),
      distinctUntilChanged()
    ).subscribe((value) => {
      this.viewContext.$implicit = value;
      this.viewContext.tslLet = value;
    });
  }

  static ngTemplateContextGuard<T>(_directive: LetDirective<T>, _context: LetContext<T>): _context is LetContext<T> {
    return true;
  }

  next(value: LetOutput<T>): void {
    this.viewContext.$implicit = value;
    this.viewContext.tslLet = value;
    this.updateEmbeddedView();
  }

  error(error: unknown): void {
    this.viewContext.hasError = true;
    this.viewContext.error = error;
    this.updateEmbeddedView();
  }

  complete(): void {
    this.viewContext.isComplete = true;
    this.updateEmbeddedView();
  }

  updateEmbeddedView(): void {
    if (isUndefined(this.embeddedView)) {
      this.embeddedView = this.viewContainer.createEmbeddedView(this.template, this.viewContext);
    }

    this.changeDetector.markForCheck();
  }

  ngOnDestroy(): void {
    this.inputSubject.complete();
    this.subscription.unsubscribe();
  }
}

function isAsyncInput<T>(value: any): value is LetAsyncInput<T> {
  return isObservable(value)
    || isAsyncIterable(value)
    || isFunction((value as PromiseLike<any> | undefined)?.then) // eslint-disable-line @typescript-eslint/unbound-method
    || isFunction((value as ReadableStreamLike<any> | undefined)?.getReader) // eslint-disable-line @typescript-eslint/unbound-method
    || isSignal(value);
}
