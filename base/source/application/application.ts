import { container, resolveArg, singleton } from '#/container';
import { disposeInstances } from '#/core';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { Module } from '#/module';
import { initializeSignals, requestShutdown, shutdownToken } from '#/process-shutdown';
import { DeferredPromise } from '#/promise';
import type { Type } from '#/types';
import { mapAsync, toArrayAsync } from '#/utils/async-iterable-helpers';
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
  private readonly shutdownPromise: DeferredPromise;

  constructor(@resolveArg<LoggerArgument>('App') logger: Logger) {
    this.logger = logger;

    this.moduleTypes = new Set();
    this.shutdownPromise = new DeferredPromise();
  }

  static registerModule(moduleType: Type<Module>): void {
    Application.instance.registerModule(moduleType);
  }

  static async run(): Promise<void> {
    await Application.instance.run();
  }

  static async shutdown(): Promise<void> {
    await Application.instance.shutdown();
  }

  registerModule(moduleType: Type<Module>): void {
    this.moduleTypes.add(moduleType);
  }

  async run(): Promise<void> {
    const modules = await toArrayAsync(mapAsync(this.moduleTypes, async (type) => container.resolveAsync(type)));

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

      this.logger.info('bye');
    }

    this.shutdownPromise.resolve();
  }

  async shutdown(): Promise<void> {
    this.logger.info('shutting down');
    requestShutdown();
    await this.shutdownPromise;
  }
}

async function runModules(modules: Module[], logger?: Logger): Promise<void> {
  const promises = modules.map(async (module) => {
    if (logger != undefined) {
      logger.verbose(`starting module ${module.name}`);
    }

    await module.run();
  });

  await Promise.all(promises);
}

async function stopModules(modules: Module[], logger?: Logger): Promise<void> {
  const promises = modules.map(async (module) => {
    if (logger != undefined) {
      logger.verbose(`stopping module ${module.name}`);
    }

    await module.stop();

    if (logger != undefined) {
      logger.verbose(`stopped module ${module.name}`);
    }
  });

  await Promise.all(promises);
}
