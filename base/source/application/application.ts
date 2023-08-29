import type { CancellationSignal } from '#/cancellation/token.js';
import { getGlobalInjector } from '#/core.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument, runInInjectionContext } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { resolveArgumentType } from '#/injector/interfaces.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { ModuleBase } from '#/module/module-base.js';
import type { Module } from '#/module/module.js';
import { ModuleState } from '#/module/module.js';
import type { FunctionModuleFunction } from '#/module/modules/function.module.js';
import { FunctionModule } from '#/module/modules/function.module.js';
import { getShutdownSignal, getShutdownToken } from '#/process-shutdown.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import type { OneOrMany, Type } from '#/types.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { isDefined, isFunction, isObject, isUndefined } from '#/utils/type-guards.js';

export type BootstrapFn = () => void | Promise<void>;

export type RunOptions = {
  bootstrap?: BootstrapFn
};

@Singleton()
export class Application implements Resolvable<LoggerArgument> {
  static _instance: Application | undefined;

  private static get instance(): Application {
    if (isUndefined(this._instance)) {
      this._instance = getGlobalInjector().resolve(Application, 'App');

      // @ts-expect-error readonly
      this._instance.#shutdownToken = getShutdownToken();
    }

    return this._instance;
  }

  readonly #name = injectArgument(this);
  readonly #injector = inject(Injector).fork(`${this.#name}Injector`);
  readonly #logger = this.#injector.resolve(Logger, this.#name);
  readonly #moduleTypesAndInstances = new Set<Module | Type<Module>>();
  readonly #shutdownPromise = new DeferredPromise();
  readonly #shutdownToken = getShutdownSignal().createChild();

  declare readonly [resolveArgumentType]: string;

  get shutdownSignal(): CancellationSignal {
    return this.#shutdownToken.signal;
  }

  static get shutdownSignal(): CancellationSignal {
    return Application.instance.shutdownSignal;
  }

  static registerModule(moduleType: Type<Module>): void {
    Application.instance.registerModule(moduleType);
  }

  static registerModuleFunction(fn: FunctionModuleFunction): void {
    Application.instance.registerModuleFunction(fn);
  }

  static run(...functionsAndModules: [RunOptions | OneOrMany<FunctionModuleFunction | Type<Module>>, ...OneOrMany<FunctionModuleFunction | Type<Module>>[]]): void {
    Application.instance.run(...functionsAndModules);
  }

  static async waitForShutdown(): Promise<void> {
    return Application.instance.waitForShutdown();
  }

  static async shutdown(): Promise<void> {
    await Application.instance.shutdown();
  }

  static requestShutdown(): void {
    Application.instance.requestShutdown();
  }

  registerModule(moduleType: Module | Type<Module>): void {
    this.#moduleTypesAndInstances.add(moduleType);
  }

  registerModuleFunction(fn: FunctionModuleFunction): void {
    const module = new FunctionModule(fn);
    this.registerModule(module);
  }

  run(...optionsFunctionsAndModules: [RunOptions | OneOrMany<FunctionModuleFunction | Type<Module>>, ...OneOrMany<FunctionModuleFunction | Type<Module>>[]]): void {
    const options = ((optionsFunctionsAndModules.length > 0) && isObject(optionsFunctionsAndModules[0])) ? optionsFunctionsAndModules[0]! as RunOptions : undefined;
    const functionsAndModules = (isUndefined(options) ? optionsFunctionsAndModules : optionsFunctionsAndModules.slice(1)) as OneOrMany<FunctionModuleFunction | Type<Module>>[];

    void this._run(functionsAndModules, options);
  }

  async shutdown(): Promise<void> {
    this.requestShutdown();
    await this.#shutdownPromise;
  }

  requestShutdown(): void {
    if (this.shutdownSignal.isSet) {
      return;
    }

    this.#shutdownToken.set();
  }

  async waitForShutdown(): Promise<void> {
    return this.#shutdownPromise;
  }

  private async _run(functionsAndModules: OneOrMany<FunctionModuleFunction | Type<Module>>[], options: RunOptions = {}): Promise<void> {
    for (const fnOrModule of functionsAndModules.flatMap((fns) => fns)) {
      if (fnOrModule.prototype instanceof ModuleBase) {
        this.registerModule(fnOrModule as Type<Module>);
      }
      else {
        this.registerModuleFunction(fnOrModule as FunctionModuleFunction);
      }
    }

    if (isDefined(options.bootstrap)) {
      await runInInjectionContext(this.#injector, options.bootstrap);
    }

    const modules = await toArrayAsync(mapAsync(this.#moduleTypesAndInstances, async (instanceOrType) => (isFunction(instanceOrType) ? this.#injector.resolveAsync(instanceOrType) : instanceOrType)));

    try {
      await Promise.race([
        this.runModules(modules),
        this.shutdownSignal
      ]);
    }
    catch (error) {
      this.#logger.error(error as Error, { includeRest: true, includeStack: true });
    }
    finally {
      this.requestShutdown();

      this.#logger.info('Shutting down');

      await this.stopModules(modules);
      await this.#injector.dispose();

      this.#logger.info('Bye');
    }

    this.#shutdownPromise.resolve();
  }

  private async runModules(modules: Module[]): Promise<void> {
    const promises = modules.map(async (module) => {
      try {
        this.#logger.info(`Starting module ${module.name}`);
        await runInInjectionContext(this.#injector, async () => module.run());
        this.#logger.info(`Module ${module.name} stopped.`);
      }
      catch (error) {
        this.#logger.error(error as Error);
        this.requestShutdown();
      }
    });

    await Promise.all(promises);
  }

  private async stopModules(modules: Module[]): Promise<void> {
    const promises = modules.map(async (module) => {
      if (module.state == ModuleState.Stopped) {
        return;
      }

      this.#logger.info(`Stopping module ${module.name}`);

      try {
        await module.stop();
      }
      catch (error) {
        this.#logger.error(error as Error);
        this.requestShutdown();
      }
    });

    await Promise.all(promises);
  }
}
