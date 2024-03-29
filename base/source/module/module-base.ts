import type { CancellationSignal } from '#/cancellation/index.js';
import { CancellationToken } from '#/cancellation/index.js';
import type { StringMap } from '#/types.js';
import type { Module, ModuleMetric } from './module.js';
import { ModuleState } from './module.js';

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
    await this.runPromise.catch(() => { /* ignore */ });
  }

  protected abstract _run(cancellationSignal: CancellationSignal): Promise<void>;
}
