import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DialogComponent } from '@tstdl/angular/dialog';
import { InputComponent, InputGroupComponent, InputGroupLabelComponent } from '@tstdl/angular/form';

@Component({
  selector: 'tsl-dialog-example',
  imports: [InputGroupComponent, InputGroupLabelComponent, InputComponent, DialogComponent],
  templateUrl: './dialog-example.component.html',
  styleUrl: './dialog-example.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block'
  }
})
export class DialogExampleComponent {

}
