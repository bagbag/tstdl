import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'tsl-input-group',
  imports: [],
  templateUrl: './input-group.component.html',
  styleUrl: './input-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw'
  }
})
export class InputGroupComponent {

}
