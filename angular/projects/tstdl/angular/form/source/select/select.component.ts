import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewEncapsulation, booleanAttribute, computed, contentChildren, inject, input, model } from '@angular/core';
import { DynamicTextPipe, LocalizePipe } from '@tstdl/angular';
import { IconComponent } from "@tstdl/angular/icon";
import { tstdlCommonLocalizationKeys } from '@tstdl/base/text';

import { SelectOptionComponent } from './select-option/select-option.component';

@Component({
  selector: 'button[tslSelect]',
  imports: [IconComponent, DynamicTextPipe, LocalizePipe, OverlayModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class SelectComponent<T> {
  readonly #elementRef = inject<ElementRef<HTMLButtonElement>>(ElementRef);
  readonly overlayTrigger = new CdkOverlayOrigin();

  readonly value = model<T | null>(null);
  readonly open = model(false);
  readonly disabled = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });

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
  toggle(): void {
    this.open.update((open) => !open);
  }

  select(value: T | null): void {
    this.value.set(value);
    this.open.set(false);
  }

  selectOption(option: SelectOptionComponent<T>): void {
    this.value.set(option.value() ?? null);
    this.open.set(false);
  }
}
