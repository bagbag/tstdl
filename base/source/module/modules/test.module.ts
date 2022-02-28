import { singleton } from '#/container';
import type { StringMap } from '#/types';
import type { ReadonlyCancellationToken } from '#/utils';
import { cancelableTimeout } from '#/utils';
import type { Module, ModuleMetric } from '../module';
import { ModuleBase } from '../module-base';

@singleton()
export class TestModule extends ModuleBase implements Module {
  metrics: StringMap<ModuleMetric> = {};

  constructor() {
    super('Test');
  }

  protected async _run(cancellationToken: ReadonlyCancellationToken): Promise<void> {
    await cancelableTimeout(2000, cancellationToken);
  }
}
