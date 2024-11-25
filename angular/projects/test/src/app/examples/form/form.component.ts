import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InputComponent, InputGroupComponent, InputGroupLabelComponent } from '@tstdl/angular/form';

@Component({
  selector: 'app-form',
  imports: [InputGroupComponent, InputComponent, InputGroupLabelComponent],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormComponent {

}
