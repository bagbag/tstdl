import type { OnChanges, TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';
import type { GridHeaderItemDirective } from '../../directives/grid-header-item.directive';
import type { GridItemDirective } from '../../directives/grid-item.directive';

@Component({
  selector: 'tsl-grid-label',
  templateUrl: './grid-label.component.html',
  styleUrls: ['./grid-label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.tsl-text-sm]': 'true',
    '[class.tsl-leading-4]': 'true',
    '[class.tsl-font-semibold]': 'true'
  }
})
export class GridLabelComponent implements OnChanges {
  @Input() item: GridItemDirective | null | undefined;
  @Input() headerItem: GridHeaderItemDirective | null | undefined;
  @Input() colon: boolean;

  templateRef: TemplateRef<void> | null | undefined;
  label: DynamicText | null | undefined;

  constructor() {
    this.colon = false;
  }

  ngOnChanges(): void {
    this.templateRef = this.item?.labelRef?.templateRef ?? this.headerItem?.templateRef;
    this.label = this.item?.label ?? this.headerItem?.label;
  }
}
