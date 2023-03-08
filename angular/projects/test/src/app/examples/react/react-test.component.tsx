import { Signal } from '@tstdl/angular';
import { Component, ComponentChild } from 'preact';

export type ReactTestComponentProperties = {
  counter: Signal<number>,
  numCounter: number,
  clickHandler: () => void
};

export class ReactTestComponent extends Component<ReactTestComponentProperties, { timer: number }> {
  private timerRef: any;

  override state = { timer: 0 };

  override componentDidMount(): void {
    this.timerRef = setInterval(() => {
      this.setState((state) => ({ timer: state.timer + 1 }));
    }, 1000);
  }

  override componentWillUnmount(): void {
    clearInterval(this.timerRef);
  }

  render(props: ReactTestComponentProperties): ComponentChild {
    return (
      <div>
        <p>Hello from preact!</p>
        <p>The regularly increasing number is a state in me increased by an interval.</p>
        <p>The click on the button is handled by a handler I got from Angular.</p>
        <p>The two numbers are a signal and a simple number I got from Angular.</p>

        <div class="flex gap-4 mt-4">
          <button class="rounded bg-indigo-600 py-1 px-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={this.props.clickHandler}>
            Click Me!
          </button>
          <span class="px-2 py-0.5 rounded border border-sky-700/25">{this.state.timer}</span>
          <span class="px-2 py-0.5 rounded border border-sky-700/25">{props.counter}</span>
          <span class="px-2 py-0.5 rounded border border-sky-700/25">{props.numCounter}</span>
        </div>
      </div>
    );
  }
}
