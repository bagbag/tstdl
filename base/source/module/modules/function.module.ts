import type { CancellationSignal } from '#/cancellation/index.js';
import { ModuleBase } from '../module-base.js';
import type { Module } from '../module.js';

export type FunctionModuleFunction = (cancellationToken: CancellationSignal) => void | Promise<void>;

export class FunctionModule extends ModuleBase implements Module {
  private readonly fn: FunctionModuleFunction;

  readonly metrics = {};

  constructor(fn: FunctionModuleFunction, name: string = fn.name) {
    super(name);

    this.fn = fn;
  }

  protected async _run(cancellationSignal: CancellationSignal): Promise<void> {
    await this.fn(cancellationSignal);
  }
}
