import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, ViewEncapsulation, computed, contentChildren, effect, forwardRef, inject, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { DynamicTextPipe, LocalizePipe } from '@tstdl/angular';
import { IconComponent } from "@tstdl/angular/icon";
import { tstdlCommonLocalizationKeys } from '@tstdl/base/text';
import { isString } from '@tstdl/base/utils';
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
  ],
  host: {
    class: 'tsl-tw',
    '[attr.disabled]': '(disabled()?.toString() == "true") ? true : null'
  }
})
export class SelectComponent<T> implements ControlValueAccessor {
  readonly #elementRef = inject<ElementRef<HTMLButtonElement>>(ElementRef);
  readonly #changeDetector = inject(ChangeDetectorRef);
  readonly overlayTrigger = new CdkOverlayOrigin();
  readonly #touchedSubject = new Subject<void>();
  readonly #touched$ = this.#touchedSubject.pipe(takeUntilDestroyed());

  readonly value = model<T | null>(null);
  readonly open = model(false);
  readonly disabledInput = model<boolean | `${boolean}` | '' | null>(false, { alias: 'disabled' });

  readonly disabled = computed(() => {
    const disabledInput = this.disabledInput();

    if (isString(disabledInput)) {
      return (disabledInput == 'true') || (disabledInput === '');
    }

    return disabledInput == true;
  });


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

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.open.set(false);
      }
    });
  }

  @HostListener('click')
  onClick(): void {
    if (this.disabled()) {
      return;
    }

    let isOpen = this.open();

    if (isOpen) {
      this.#touchedSubject.next();
    }

    this.toggle();
  }

  toggle(): void {
    if (this.disabled()) {
      return;
    }

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
    this.disabledInput.set(isDisabled);
  }
}
