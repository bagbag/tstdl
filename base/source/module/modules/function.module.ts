import type { ReadonlyCancellationToken } from '#/utils/cancellation-token';
import type { Module } from '../module';
import { ModuleBase } from '../module-base';

export type FunctionModuleFunction = (cancellationToken: ReadonlyCancellationToken) => void | Promise<void>;

export class FunctionModule extends ModuleBase implements Module {
  private readonly fn: FunctionModuleFunction;

  readonly metrics = {};

  constructor(fn: FunctionModuleFunction, name: string = fn.name) {
    super(name);
  }

  protected async _run(cancellationToken: ReadonlyCancellationToken): Promise<void> {
    return this.fn(cancellationToken);
  }
}
