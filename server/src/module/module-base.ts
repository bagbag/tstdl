import type { StringMap } from '@tstdl/base/types';
import { CancellationToken } from '@tstdl/base/utils/cancellation-token';
import type { Module, ModuleMetric } from './module';
import { ModuleState } from './module';

export abstract class ModuleBase implements Module {
  private readonly _cancellationToken: CancellationToken;

  private runPromise: Promise<void>;
  private state: ModuleState;

  readonly name: string;

  abstract readonly metrics: StringMap<ModuleMetric>;

  protected get cancellationToken(): CancellationToken {
    return this._cancellationToken;
  }

  private get stateString(): string {
    return ModuleState[this.state]!.toLowerCase();
  }

  constructor(name: string) {
    this.name = name;
    this.runPromise = Promise.resolve();
    this.state = ModuleState.Stopped;
    this._cancellationToken = new CancellationToken();
  }

  async run(): Promise<void> {
    if (this.state != ModuleState.Stopped) {
      throw new Error(`cannot start module, it is ${this.stateString}`);
    }

    this.cancellationToken.reset();

    try {
      this.state = ModuleState.Running;
      this.runPromise = this._run(this._cancellationToken);
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
