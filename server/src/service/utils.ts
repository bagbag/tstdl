import { Logger } from '@common-ts/base/logger';
import { Service } from './service';

export async function startServices(services: Service[], logger?: Logger): Promise<void> {
  const promises = services.map(async (service) => {
    if (logger != undefined) {
      logger.verbose(`starting service ${service.name}`);
    }

    await service.start();
  });

  await Promise.all(promises);
}

export async function stopServices(services: Service[], logger?: Logger): Promise<void> {
  const promises = services.map(async (service) => {
    if (logger != undefined) {
      logger.verbose(`stopping service ${service.name}`);
    }

    await service.stop();

    if (logger != undefined) {
      logger.verbose(`stopped service ${service.name}`);
    }
  });

  await Promise.all(promises);
}
