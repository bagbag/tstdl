import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Directive, DoCheck, ElementRef, Input, Renderer2, Signal, computed, effect, inject, isSignal, signal } from '@angular/core';
import { Record } from '@tstdl/base/types';
import { ValueOrProvider, resolveValueOrProvider } from '@tstdl/base/utils';

export type HostClassInput = string | string[] | Set<string> | Record<string> | null | undefined;

@Directive({
  selector: '[tslHostClass]',
  standalone: true
})
export class TslHostClass implements DoCheck {
  readonly #ngClass = new NgClass(inject(ElementRef), inject(Renderer2));
  readonly #changeDetector = inject(ChangeDetectorRef);
  readonly #classes = signal<HostClassInput>(null);

  @Input()
  get classes(): HostClassInput {
    return this.#classes();
  }

  set classes(classes: HostClassInput) {
    this.#classes.set(classes);
  }

  constructor() {
    effect(() => {
      this.#ngClass.ngClass = this.#classes();
      this.#ngClass.ngDoCheck();
      this.#changeDetector.markForCheck();
    });
  }

  ngDoCheck(): void {
    this.#ngClass.ngDoCheck();
  }
}

export function hostClass(classes: ValueOrProvider<HostClassInput> | Signal<HostClassInput>): TslHostClass {
  const instance = new TslHostClass();
  const inputSignal = isSignal(classes) ? classes as Signal<HostClassInput> : computed(() => resolveValueOrProvider(classes));

  effect(() => (instance.classes = inputSignal()));

  return instance;
}
