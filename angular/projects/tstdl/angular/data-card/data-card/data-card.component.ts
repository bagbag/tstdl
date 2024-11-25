import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { DynamicTextPipe } from '@tstdl/angular';
import type { DynamicText } from '@tstdl/base/text';

@Component({
  selector: 'tsl-data-card',
  imports: [DynamicTextPipe],
  templateUrl: './data-card.component.html',
  styleUrls: ['./data-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tsl-tw block bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-[1.5px] border-neutral-300 dark:border-neutral-800 rounded-lg overflow-hidden break-words text-sm leading-4 break-inside-avoid isolate'
  }
})
export class DataCardComponent {
  @Input({ required: true }) heading: DynamicText;
  @Input({ transform: booleanAttribute }) padding = true;
}
