import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tsl-center',
  templateUrl: './center.component.html',
  styleUrls: ['./center.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenterComponent {
}
