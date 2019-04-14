import { Logger } from '@common-ts/base/logger';
import { Module } from './module';

export async function runModules(modules: Module[], logger?: Logger): Promise<void> {
  const promises = modules.map(async (module) => {
    if (logger != undefined) {
      logger.verbose(`starting module ${module.name}`);
    }

    await module.run();
  });

  await Promise.all(promises);
}

export async function stopModules(modules: Module[], logger?: Logger): Promise<void> {
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
