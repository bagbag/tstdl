import { container, resolveArg, singleton } from '#/container';
import { disposeInstances } from '#/core';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { Module } from '#/module';
import { ModuleState } from '#/module';
import type { FunctionModuleFunction } from '#/module/modules';
import { FunctionModule } from '#/module/modules';
import { initializeSignals, requestShutdown, shutdownToken } from '#/process-shutdown';
import { DeferredPromise } from '#/promise';
import type { OneOrMany, Type } from '#/types';
import { mapAsync, toArrayAsync } from '#/utils/async-iterable-helpers';
import type { CancellationToken } from '#/utils/cancellation-token';
import { isUndefined } from '#/utils/type-guards';

initializeSignals();

@singleton()
export class Application {
  private static _instance: Application | undefined;

  private static get instance(): Application {
    if (isUndefined(this._instance)) {
      this._instance = container.resolve(Application);
    }

    return this._instance;
  }

  private readonly logger: Logger;
  private readonly moduleTypes: Set<Type<Module>>;
  private readonly moduleInstances: Set<Module>;
  private readonly shutdownPromise: DeferredPromise;

  static get shutdownToken(): CancellationToken {
    return shutdownToken;
  }

  constructor(@resolveArg<LoggerArgument>('App') logger: Logger) {
    this.logger = logger;

    this.moduleTypes = new Set();
    this.moduleInstances = new Set();
    this.shutdownPromise = new DeferredPromise();
  }

  static registerModule(moduleType: Type<Module>): void {
    Application.instance.registerModule(moduleType);
  }

  static registerModuleInstance(module: Module): void {
    Application.instance.registerModuleInstance(module);
  }

  static async run(...functions: OneOrMany<FunctionModuleFunction>[]): Promise<void> {
    await Application.instance.run(...functions);
  }

  static async shutdown(): Promise<void> {
    await Application.instance.shutdown();
  }

  registerModule(moduleType: Type<Module>): void {
    this.moduleTypes.add(moduleType);
  }

  registerModuleInstance(module: Module): void {
    this.moduleInstances.add(module);
  }

  async run(...functions: OneOrMany<FunctionModuleFunction>[]): Promise<void> {
    for (const fn of functions.flatMap((fns) => fns)) {
      const module = new FunctionModule(fn);
      this.registerModuleInstance(module);
    }

    const resolvedModules = await toArrayAsync(mapAsync(this.moduleTypes, async (type) => container.resolveAsync(type)));
    const modules = [...resolvedModules, ...this.moduleInstances];

    try {
      await Promise.race([
        runModules(modules, this.logger),
        shutdownToken
      ]);
    }
    catch (error) {
      this.logger.error(error as Error, { includeRest: true, includeStack: true });
    }
    finally {
      requestShutdown();

      await stopModules(modules, this.logger);
      await disposeInstances();

      this.logger.info('Bye');
    }

    this.shutdownPromise.resolve();
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down');
    requestShutdown();
    await this.shutdownPromise;
  }
}

async function runModules(modules: Module[], logger?: Logger): Promise<void> {
  const promises = modules.map(async (module) => {
    if (logger != undefined) {
      logger.verbose(`Starting module ${module.name}`);
    }

    await module.run();
  });

  await Promise.all(promises);
}

async function stopModules(modules: Module[], logger?: Logger): Promise<void> {
  const promises = modules.map(async (module) => {
    if (module.state == ModuleState.Stopped) {
      if (logger != undefined) {
        logger.verbose(`Module ${module.name} already stopped`);
      }

      return;
    }

    if (logger != undefined) {
      logger.verbose(`Stopping module ${module.name}`);
    }

    await module.stop();

    if (logger != undefined) {
      logger.verbose(`Stopped module ${module.name}`);
    }
  });

  await Promise.all(promises);
}
