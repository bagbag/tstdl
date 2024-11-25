import { ChangeDetectionStrategy, Component } from '@angular/core';
import { InputComponent } from '@tstdl/angular/form';

@Component({
  selector: 'app-misc-examples',
  imports: [InputComponent],
  templateUrl: './misc-examples.component.html',
  styleUrl: './misc-examples.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiscExamplesComponent {

}
