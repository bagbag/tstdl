import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'tsl-input-group-label, [tslInputGroupLabel]',
  standalone: true,
  imports: [],
  templateUrl: './input-group-label.component.html',
  styleUrl: './input-group-label.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw'
  }
})
export class InputGroupLabelComponent {

}
