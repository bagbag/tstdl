import type { EmbeddedViewRef, OnDestroy } from '@angular/core';
import { ChangeDetectorRef, Directive, ErrorHandler, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { isNullOrUndefined, isUndefined } from '@tstdl/base/cjs/utils';
import type { Observable, ObservableInput, Subscription } from 'rxjs';
import { BehaviorSubject, catchError, distinctUntilChanged, EMPTY, from, of, switchMap, tap } from 'rxjs';

export interface LetContext<T> {
  $implicit: T;
  tslLet: T;
  isComplete: boolean;
  hasError: boolean;
  error: any;
}

type LetInput<T> = ObservableInput<T> | null | undefined;

@Directive({
  selector: '[tslLet]'
})
export class LetDirective<T> implements OnDestroy {
  static ngTemplateGuard_tslLet: 'binding'; // eslint-disable-line @typescript-eslint/naming-convention

  private readonly template: TemplateRef<LetContext<T>>;
  private readonly viewContainer: ViewContainerRef;
  private readonly changeDetector: ChangeDetectorRef;
  private readonly inputSubject: BehaviorSubject<LetInput<T>>;
  private readonly subscription: Subscription;
  private readonly viewContext: LetContext<T | null | undefined>;

  private embeddedView: EmbeddedViewRef<LetContext<T | null | undefined>> | undefined;

  @Input() // eslint-disable-line accessor-pairs
  set tslLet(observableInput: ObservableInput<T> | null | undefined) {
    this.inputSubject.next(observableInput);
  }

  constructor(template: TemplateRef<LetContext<T>>, viewContainer: ViewContainerRef, changeDetector: ChangeDetectorRef, errorHandler: ErrorHandler) {
    this.template = template;
    this.viewContainer = viewContainer;
    this.changeDetector = changeDetector;

    this.inputSubject = new BehaviorSubject<LetInput<T>>(undefined);

    this.viewContext = {
      $implicit: undefined,
      tslLet: undefined,
      isComplete: false,
      hasError: false,
      error: undefined
    };

    this.subscription = this.inputSubject.pipe(
      switchMap((input) => {
        this.viewContext.isComplete = false;
        this.viewContext.hasError = false;
        this.viewContext.error = undefined;

        return ((isNullOrUndefined(input) ? of(input) : from(input)) as Observable<T | null | undefined>).pipe(
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

  next(value: T | null | undefined): void {
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
