import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { WritableSignal } from '@tstdl/angular';
import { signal } from '@tstdl/angular';
import { TstdlReactModule } from '@tstdl/angular/react';
import type { ReactTestComponentProperties } from './react-test.component';
import { ReactTestComponent } from './react-test.component';

@Component({
  selector: 'app-react',
  standalone: true,
  imports: [TstdlReactModule],
  templateUrl: './react.component.html',
  styleUrls: ['./react.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReactComponent {
  readonly ReactTestComponent = ReactTestComponent;

  readonly counter = signal(0);

  properties: WritableSignal<ReactTestComponentProperties> = signal({
    counter: this.counter,
    numCounter: 0,
    clickHandler: () => this.onClick()
  });

  onClick(): void {
    this.counter.update((counter) => counter + 1);
    this.properties.update((props) => ({ ...props, numCounter: props.numCounter + 2 }));
  }
}

export default ReactComponent;
