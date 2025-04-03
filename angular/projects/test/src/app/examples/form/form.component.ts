import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InputComponent, InputGroupComponent, InputGroupLabelComponent, SelectComponent, SelectOptionComponent } from '@tstdl/angular/form';

@Component({
  selector: 'app-form',
  imports: [InputGroupComponent, InputComponent, InputGroupLabelComponent, SelectComponent, SelectOptionComponent],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormComponent {

}
