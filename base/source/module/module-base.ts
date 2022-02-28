import type { StringMap } from '#/types';
import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import { CancellationToken } from '#/utils/cancellation-token';
import type { Module, ModuleMetric } from './module';
import { ModuleState } from './module';

export abstract class ModuleBase implements Module {
  private runPromise: Promise<void>;
  private _state: ModuleState;

  protected readonly cancellationToken: CancellationToken;

  readonly name: string;

  abstract readonly metrics: StringMap<ModuleMetric>;

  get state(): ModuleState {
    return this._state;
  }

  private get stateString(): string {
    return ModuleState[this._state]!.toLowerCase();
  }

  constructor(name: string) {
    this.name = name;

    this.runPromise = Promise.resolve();
    this._state = ModuleState.Stopped;
    this.cancellationToken = new CancellationToken();
  }

  async run(): Promise<void> {
    if (this._state != ModuleState.Stopped) {
      throw new Error(`cannot start module, it is ${this.stateString}`);
    }

    this.cancellationToken.unset();

    try {
      this._state = ModuleState.Running;
      this.runPromise = this._run(this.cancellationToken);
      await this.runPromise;
      this._state = ModuleState.Stopped;
    }
    catch (error: unknown) {
      this._state = ModuleState.Erroneous;
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.cancellationToken.set();
    await this.runPromise;
  }

  protected abstract _run(cancellationToken: ReadonlyCancellationToken): Promise<void>;
}
