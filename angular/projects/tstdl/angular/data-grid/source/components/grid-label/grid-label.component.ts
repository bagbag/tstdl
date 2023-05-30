import { NgIf, NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { DynamicTextPipe, LocalizeEnumPipe } from '@tstdl/angular';
import type { DynamicText } from '@tstdl/base/text';
import type { Enumeration } from '@tstdl/base/types';

@Component({
  selector: 'tsl-grid-label',
  standalone: true,
  imports: [NgIf, NgTemplateOutlet, DynamicTextPipe, LocalizeEnumPipe],
  templateUrl: './grid-label.component.html',
  styleUrls: ['./grid-label.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
  host: {
    class: 'leading-4 font-semibold'
  }
})
export class GridLabelComponent {
  @Input() label: DynamicText | null | undefined;
  @Input() enum: Enumeration | null | undefined;
  @Input() templateRef: TemplateRef<void> | null | undefined;
  @Input() colon: boolean;

  constructor(_changeDetector: ChangeDetectorRef) {
    this.colon = false;
  }
}
