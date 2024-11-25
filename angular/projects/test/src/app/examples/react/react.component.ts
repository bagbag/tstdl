import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ReactComponent } from '@tstdl/angular/react';

import type { ReactTestComponentProperties } from './react-test.component';
import { ReactTestComponent } from './react-test.component';

@Component({
  selector: 'app-react',
  imports: [ReactComponent],
  templateUrl: './react.component.html',
  styleUrls: ['./react.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReactExampleComponent {
  readonly ReactTestComponent = ReactTestComponent;

  readonly counter = signal(0);

  properties = signal<ReactTestComponentProperties>({
    counter: this.counter,
    numCounter: 0,
    clickHandler: () => this.onClick()
  });

  onClick(): void {
    this.counter.update((counter) => counter + 1);
    this.properties.update((props) => ({ ...props, numCounter: props.numCounter + 2 }));
  }
}

export default ReactExampleComponent;
