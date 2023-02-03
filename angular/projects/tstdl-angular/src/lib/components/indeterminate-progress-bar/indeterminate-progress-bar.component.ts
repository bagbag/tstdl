import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'tsl-indeterminate-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './indeterminate-progress-bar.component.html',
  styleUrls: ['./indeterminate-progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndeterminateProgressBarComponent {
  @HostBinding('style.background-color')
  @Input() backgroundColor: string | null | undefined;

  @Input() color: string | null | undefined;

  constructor() {
    this.backgroundColor = '#e2e8f0';
    this.color = '#3b82f6';
  }
}
