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
    '[class.tsl-block]': 'true',
    '[class.tsl-relative]': 'true',
    '[class.tsl-h-2]': 'true',
    '[class.tsl-overflow-hidden]': 'true',
    '[class.tsl-rounded-full]': 'true'
  }
})
export class IndeterminateProgressBarComponent {
  @HostBinding('style.--tsl-indeterminate-progress-bar-background-color')
  @Input() backgroundColor: string | null | undefined;

  @HostBinding('style.--tsl-indeterminate-progress-bar-color')
  @Input() color: string | null | undefined;
}
