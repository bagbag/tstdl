import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'tsl-indeterminate-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './indeterminate-progress-bar.component.html',
  styleUrls: ['./indeterminate-progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.tsl-tw]': 'true',
    '[class.block]': 'true',
    '[class.relative]': 'true',
    '[class.h-2]': 'true',
    '[class.overflow-hidden]': 'true',
    '[class.rounded-full]': 'true'
  }
})
export class IndeterminateProgressBarComponent {
  @HostBinding('style.--tsl-indeterminate-progress-bar-background-color')
  @Input() backgroundColor: string | null | undefined;

  @HostBinding('style.--tsl-indeterminate-progress-bar-color')
  @Input() color: string | null | undefined;
}
