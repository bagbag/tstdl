import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VerticalTabComponent, VerticalTabGroupComponent } from '@tstdl/angular/vertical-tab-group';
import { VerticalTabLabelDirective } from '@tstdl/angular/vertical-tab-group/source/vertical-tab/vertical-tab-label.directive';

@Component({
  selector: 'app-vertical-tab-group-example',
  imports: [VerticalTabComponent, VerticalTabGroupComponent, VerticalTabLabelDirective],
  templateUrl: './vertical-tab-group-example.component.html',
  styleUrl: './vertical-tab-group-example.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerticalTabGroupExampleComponent {

}
