import { Redis } from 'ioredis';
import { RedisTransactionWrapper } from './transaction-wrapper';
import { TypedRedis } from './typed-redis';

export class TypedRedisTransaction extends TypedRedis {
  private readonly transactionWrapper: RedisTransactionWrapper;

  constructor(redis: Redis) {
    const transactionWrapper = new RedisTransactionWrapper(redis);

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
