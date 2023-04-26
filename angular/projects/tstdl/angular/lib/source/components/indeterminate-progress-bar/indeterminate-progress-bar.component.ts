import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tsl-indeterminate-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './indeterminate-progress-bar.component.html',
  styleUrls: ['./indeterminate-progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tsl-tw block relative h-1.5 overflow-hidden'
  }
})
export class TstdlIndeterminateProgressBarComponent {
}
