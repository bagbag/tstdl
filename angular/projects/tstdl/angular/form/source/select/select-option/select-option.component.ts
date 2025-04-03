import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, input, ViewEncapsulation } from '@angular/core';
import { DynamicTextPipe, LocalizeEnumPipe } from '@tstdl/angular';
import type { DynamicText } from '@tstdl/base/text';
import type { Enumeration } from '@tstdl/base/types';

import { SelectComponent } from '../select.component';

@Component({
  selector: 'button[tslSelectOption]',
  imports: [DynamicTextPipe, LocalizeEnumPipe],
  templateUrl: './select-option.component.html',
  styleUrls: ['./select-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class SelectOptionComponent<T> {
  private readonly selectComponent = inject<SelectComponent<T>>(SelectComponent);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly label = input<DynamicText | null>(null);
  readonly labelEnum = input<Enumeration | null>(null);
  readonly value = input.required<T>();

  readonly optionText = computed(() => this.label() ?? (this.elementRef.nativeElement.textContent ?? '').trim());

  @HostListener('click')
  select(): void {
    this.selectComponent.selectOption(this);
  }
}
