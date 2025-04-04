import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, ViewEncapsulation, computed, contentChildren, forwardRef, inject, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { DynamicTextPipe, LocalizePipe } from '@tstdl/angular';
import { IconComponent } from "@tstdl/angular/icon";
import { tstdlCommonLocalizationKeys } from '@tstdl/base/text';
import { Subject } from 'rxjs';

import { SelectOptionComponent } from './select-option/select-option.component';

@Component({
  selector: 'button[tslSelect]',
  imports: [IconComponent, DynamicTextPipe, LocalizePipe, OverlayModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }
  ]
})
export class SelectComponent<T> implements ControlValueAccessor {
  readonly #elementRef = inject<ElementRef<HTMLButtonElement>>(ElementRef);
  readonly #changeDetector = inject(ChangeDetectorRef);
  readonly overlayTrigger = new CdkOverlayOrigin();
  readonly #touchedSubject = new Subject<void>();
  readonly #touched$ = this.#touchedSubject.pipe(takeUntilDestroyed());

  readonly value = model<T | null>(null);
  readonly open = model(false);
  readonly disabled = model<boolean | `${boolean}`>(false);

  readonly options = contentChildren<SelectOptionComponent<T>>(SelectOptionComponent);

  readonly selectedOption = computed(() => this.options().find((option) => option.value() == this.value()) ?? null);

  readonly commonLocalizationKeys = tstdlCommonLocalizationKeys;

  get overlayWidth(): number {
    return this.#elementRef.nativeElement.getBoundingClientRect().width;
  }

  get id(): string {
    return this.#elementRef.nativeElement.id;
  }

  set id(id: string) {
    this.#elementRef.nativeElement.id = id;
  }

  @HostListener('click')
  onClick(): void {
    let isOpen = this.open();

    if (isOpen) {
      this.#touchedSubject.next();
    }

    this.toggle();
  }

  toggle(): void {
    this.open.update((open) => !open);
  }

  select(value: T | null): void {
    this.value.set(value);
    this.open.set(false);
    this.#changeDetector.markForCheck();
  }

  selectOption(option: SelectOptionComponent<T>): void {
    this.select(option.value());
  }

  writeValue(obj: any): void {
    this.select(obj);
  }

  registerOnChange(fn: any): void {
    this.value.subscribe(fn);
  }

  registerOnTouched(fn: any): void {
    this.#touched$.subscribe(fn);
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
