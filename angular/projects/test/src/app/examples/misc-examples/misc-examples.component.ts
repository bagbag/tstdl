import { ChangeDetectionStrategy, Component } from '@angular/core';
import { InputComponent } from '@tstdl/angular/form';
import { TooltipDirective } from '@tstdl/angular/tooltip';

@Component({
  selector: 'app-misc-examples',
  imports: [InputComponent, TooltipDirective],
  templateUrl: './misc-examples.component.html',
  styleUrl: './misc-examples.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiscExamplesComponent {

}
