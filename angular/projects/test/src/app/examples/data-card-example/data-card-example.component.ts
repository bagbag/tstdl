import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataCardComponent } from '@tstdl/angular/data-card';

@Component({
  selector: 'app-data-card-example',
  imports: [DataCardComponent],
  templateUrl: './data-card-example.component.html',
  styleUrls: ['./data-card-example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataCardExampleComponent {
}

export default DataCardExampleComponent;
