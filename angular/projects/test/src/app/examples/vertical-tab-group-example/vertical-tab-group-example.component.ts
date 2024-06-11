import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VerticalTabComponent, VerticalTabGroupComponent } from '@tstdl/angular/vertical-tab-group';

@Component({
  selector: 'app-vertical-tab-group-example',
  standalone: true,
  imports: [VerticalTabComponent, VerticalTabGroupComponent],
  templateUrl: './vertical-tab-group-example.component.html',
  styleUrl: './vertical-tab-group-example.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerticalTabGroupExampleComponent {

}
