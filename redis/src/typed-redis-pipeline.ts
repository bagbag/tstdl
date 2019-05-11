import { Redis } from 'ioredis';
import { RedisPipelineWrapper } from './pipeline-wrapper';
import { TypedRedis } from './typed-redis';

export class TypedRedisPipeline extends TypedRedis {
  private readonly transactionWrapper: RedisPipelineWrapper;

  constructor(redis: Redis, transaction: boolean) {
    const transactionWrapper = new RedisPipelineWrapper(redis, transaction);

    super(transactionWrapper);

    this.transactionWrapper = transactionWrapper;
  }

  async discard(): Promise<void> {
    return this.transactionWrapper.discard();
  }

  async execute(): Promise<void> {
    const replies = await this.transactionWrapper.execute();

    for (const [error] of replies) {
      if (error != undefined) {
        throw error;
      }
    }
  }
}
