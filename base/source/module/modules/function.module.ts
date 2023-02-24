import type { ReadonlyCancellationToken } from '#/utils/cancellation-token.js';
import type { Module } from '../module.js';
import { ModuleBase } from '../module-base.js';

export type FunctionModuleFunction = (cancellationToken: ReadonlyCancellationToken) => void | Promise<void>;

export class FunctionModule extends ModuleBase implements Module {
  private readonly fn: FunctionModuleFunction;

  readonly metrics = {};

  constructor(fn: FunctionModuleFunction, name: string = fn.name) {
    super(name);

    this.fn = fn;
  }

  protected async _run(cancellationToken: ReadonlyCancellationToken): Promise<void> {
    return this.fn(cancellationToken);
  }
}
