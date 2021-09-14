import type { StringMap } from '#/types';
import { CancellationToken } from '#/utils/cancellation-token';
import type { Module, ModuleMetric } from './module';
import { ModuleState } from './module';

export abstract class ModuleBase implements Module {
  private runPromise: Promise<void>;
  private state: ModuleState;

  protected readonly cancellationToken: CancellationToken;

  readonly name: string;

  abstract readonly metrics: StringMap<ModuleMetric>;

  private get stateString(): string {
    return ModuleState[this.state]!.toLowerCase();
  }

  constructor(name: string) {
    this.name = name;
    this.runPromise = Promise.resolve();
    this.state = ModuleState.Stopped;
    this.cancellationToken = new CancellationToken();
  }

  async run(): Promise<void> {
    if (this.state != ModuleState.Stopped) {
      throw new Error(`cannot start module, it is ${this.stateString}`);
    }

    this.cancellationToken.unset();

    try {
      this.state = ModuleState.Running;
      this.runPromise = this._run(this.cancellationToken);
      await this.runPromise;
      this.state = ModuleState.Stopped;
    }
    catch (error: unknown) {
      this.state = ModuleState.Erroneous;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.state != ModuleState.Running) {
      throw new Error(`cannot stop module, it is ${this.stateString}`);
    }

    this.cancellationToken.set();
    await this.runPromise;
  }

  protected abstract _run(cancellationToken: CancellationToken): Promise<void>;
}
