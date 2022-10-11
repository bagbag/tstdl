import { container, resolveArg, singleton } from '#/container';
import { disposeInstances } from '#/core';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { Module } from '#/module/module';
import { ModuleState } from '#/module/module';
import { ModuleBase } from '#/module/module-base';
import type { FunctionModuleFunction } from '#/module/modules/function.module';
import { FunctionModule } from '#/module/modules/function.module';
import { initializeSignals, shutdownToken } from '#/process-shutdown';
import { DeferredPromise } from '#/promise/deferred-promise';
import type { OneOrMany, Type } from '#/types';
import { mapAsync } from '#/utils/async-iterable-helpers/map';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array';
import type { CancellationToken, ReadonlyCancellationToken } from '#/utils/cancellation-token';
import { isUndefined } from '#/utils/type-guards';

/**
 * TODO
 *
 * container scopes
 * dispose per container
 */

initializeSignals();

@singleton()
export class Application {
  private static _instance: Application | undefined;

  private static get instance(): Application {
    if (isUndefined(this._instance)) {
      this._instance = container.resolve(Application);

      // @ts-expect-error readonly
      this._instance._shutdownToken = shutdownToken;
      // @ts-expect-error readonly
      this._instance.shutdownToken = shutdownToken.asReadonly;
    }

    return this._instance;
  }

  private readonly logger: Logger;
  private readonly moduleTypes: Set<Type<Module>>;
  private readonly moduleInstances: Set<Module>;
  private readonly shutdownPromise: DeferredPromise;
  private readonly _shutdownToken: CancellationToken;

  readonly shutdownToken: ReadonlyCancellationToken;

  static get shutdownToken(): ReadonlyCancellationToken {
    return Application.instance.shutdownToken;
  }

  constructor(@resolveArg<LoggerArgument>('App') logger: Logger) {
    this.logger = logger;

    this.moduleTypes = new Set();
    this.moduleInstances = new Set();
    this.shutdownPromise = new DeferredPromise();
    this._shutdownToken = shutdownToken.createChild();
    this.shutdownToken = this._shutdownToken.asReadonly;
  }

  static registerModule(moduleType: Type<Module>): void {
    Application.instance.registerModule(moduleType);
  }

  static registerModuleFunction(fn: FunctionModuleFunction): void {
    Application.instance.registerModuleFunction(fn);
  }

  static registerModuleInstance(module: Module): void {
    Application.instance.registerModuleInstance(module);
  }

  static run(...functionsAndModules: OneOrMany<FunctionModuleFunction | Type<Module>>[]): void {
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

  registerModule(moduleType: Type<Module>): void {
    this.moduleTypes.add(moduleType);
  }

  registerModuleFunction(fn: FunctionModuleFunction): void {
    const module = new FunctionModule(fn);
    this.registerModuleInstance(module);
  }

  registerModuleInstance(module: Module): void {
    this.moduleInstances.add(module);
  }

  run(...functionsAndModules: OneOrMany<FunctionModuleFunction | Type<Module>>[]): void {
    void this._run(...functionsAndModules);
  }

  async shutdown(): Promise<void> {
    this.requestShutdown();
    await this.shutdownPromise;
  }

  requestShutdown(): void {
    if (this.shutdownToken.isSet) {
      return;
    }

    this._shutdownToken.set();
  }

  async waitForShutdown(): Promise<void> {
    return this.shutdownPromise;
  }

  private async _run(...functionsAndModules: OneOrMany<FunctionModuleFunction | Type<Module>>[]): Promise<void> {
    for (const fnOrModule of functionsAndModules.flatMap((fns) => fns)) {
      if (fnOrModule.prototype instanceof ModuleBase) {
        this.registerModule(fnOrModule as Type<Module>);
      }
      else {
        this.registerModuleFunction(fnOrModule as FunctionModuleFunction);
      }
    }

    const resolvedModules = await toArrayAsync(mapAsync(this.moduleTypes, async (type) => container.resolveAsync(type)));
    const modules = [...this.moduleInstances, ...resolvedModules];

    try {
      await Promise.race([
        this.runModules(modules),
        this.shutdownToken
      ]);
    }
    catch (error) {
      this.logger.error(error as Error, { includeRest: true, includeStack: true });
    }
    finally {
      this.requestShutdown();

      this.logger.info('Shutting down');

      await this.stopModules(modules);
      await disposeInstances();

      this.logger.info('Bye');
    }

    this.shutdownPromise.resolve();
  }

  private async runModules(modules: Module[]): Promise<void> {
    const promises = modules.map(async (module) => {
      try {
        this.logger.info(`Starting module ${module.name}`);
        await module.run();
        this.logger.info(`Module ${module.name} stopped.`);
      }
      catch (error) {
        this.logger.error(error as Error);
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

      this.logger.info(`Stopping module ${module.name}`);

      try {
        await module.stop();
      }
      catch (error) {
        this.logger.error(error as Error);
        this.requestShutdown();
      }
    });

    await Promise.all(promises);
  }
}
