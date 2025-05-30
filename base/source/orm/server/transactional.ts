import { PgTransaction as DrizzlePgTransaction } from 'drizzle-orm/pg-core';

import { createContextProvider } from '#/context/context.js';
import { Injector, type InjectionToken, type ResolveArgument } from '#/injector/index.js';
import { inject, runInInjectionContext } from '#/injector/inject.js';
import type { Type } from '#/types.js';
import { isDefined, isNull, isUndefined } from '#/utils/type-guards.js';
import { Database } from './database.js';
import { DrizzleTransaction, type PgTransaction, type Transaction, type TransactionConfig } from './transaction.js';

export type TransactionInitOptions = TransactionConfig & {
  /**
   * Indicates that an existing transaction should be used if available instead of creating a new one.
   * @default true
   */
  useExisting?: boolean,
};

export type TransactionHandler<R> = (transaction: Transaction) => Promise<R>;

type TransactionalContext<ContextData = unknown> = {
  session: Database | PgTransaction,
  cache: WeakMap<Database | PgTransaction, any>,
  data: ContextData,
};

const transactionCache = new WeakMap<PgTransaction, DrizzleTransaction>();

const { getCurrentTransactionalContext, runInTransactionalContext, isInTransactionalContext } = createContextProvider<TransactionalContext, 'Transactional'>('Transactional');
export { getCurrentTransactionalContext, isInTransactionalContext, runInTransactionalContext };

function transactionalContextDataGuardFunction(): any {
  throw new Error('function getTransactionalContextData must be implemented to use transactional context data.');
}

const transactionalContextDataGuard = new Proxy<any>({}, {
  apply: transactionalContextDataGuardFunction,
  construct: transactionalContextDataGuardFunction,
  defineProperty: transactionalContextDataGuardFunction,
  deleteProperty: transactionalContextDataGuardFunction,
  get: transactionalContextDataGuardFunction,
  getOwnPropertyDescriptor: transactionalContextDataGuardFunction,
  getPrototypeOf: transactionalContextDataGuardFunction,
  has: transactionalContextDataGuardFunction,
  isExtensible: transactionalContextDataGuardFunction,
  ownKeys: transactionalContextDataGuardFunction,
  preventExtensions: transactionalContextDataGuardFunction,
  set: transactionalContextDataGuardFunction,
  setPrototypeOf: transactionalContextDataGuardFunction,
});

export abstract class Transactional<ContextData = unknown> {
  readonly #injector = inject(Injector);
  readonly #classConstructor: Type<this, []>;
  readonly #context = getCurrentTransactionalContext() ?? {} as Partial<TransactionalContext<ContextData>>;
  readonly #instanceCache: WeakMap<Database | PgTransaction, this> = this.#context.cache ?? new WeakMap();
  readonly session = this.#context.session ?? inject(Database);
  readonly isInTransaction = this.session instanceof DrizzlePgTransaction;

  constructor() {
    this.#classConstructor = new.target as Type<this, []>;
  }

  /**
   * Starts a new database transaction.
   * @param config Optional transaction configuration.
   * @returns A promise that resolves to the new Transaction instance.
   */
  async startTransaction(config?: TransactionInitOptions): Promise<Transaction> {
    if ((config?.useExisting != false) && this.isInTransaction) {
      const existing = transactionCache.get(this.session as PgTransaction);

      if (isDefined(existing)) {
        return existing;
      }
    }

    const transaction = await DrizzleTransaction.create(this.session, config);
    transactionCache.set(transaction.pgTransaction, transaction);

    return transaction;
  }

  /**
   * Returns a new instance of the repository bound to the provided session.
   * Useful for performing multiple operations within a single database session.
   * @param session The session to bind to.
   * @returns A new repository instance bound to the session.
   */
  withSession(session: Database | PgTransaction): this {
    if (this.#instanceCache.has(session)) {
      return this.#instanceCache.get(session)!;
    }

    if (session == this.session) {
      this.#instanceCache.set(session, this);
      return this;
    }

    const context: TransactionalContext = {
      session: session,
      cache: this.#instanceCache,
      data: this.getTransactionalContextData(),
    };

    const repositoryWithSession = runInInjectionContext(this.#injector, () => runInTransactionalContext(context, () => new this.#classConstructor()));

    this.#instanceCache.set(session, repositoryWithSession);

    return repositoryWithSession;
  }

  /**
     * Returns a new instance of the repository bound to the provided transaction, if a transaction is provided.
     * Otherwise, returns the current instance.
     * @param transaction The transaction to bind to (optional).
     * @returns A repository instance bound to the transaction or the current instance.
     */
  withOptionalTransaction(transaction: Transaction | undefined): this {
    if (isUndefined(transaction)) {
      return this;
    }

    return this.withTransaction(transaction);
  }

  /**
   * Returns a new instance of the repository bound to the provided transaction.
   * Useful for performing multiple operations within a single database transaction.
   * @param transaction The transaction to bind to.
   * @returns A new repository instance bound to the transaction.
   */
  withTransaction(transaction: Transaction): this {
    return this.withSession((transaction as DrizzleTransaction).pgTransaction);
  }

  /**
   * Executes a handler function within the provided transaction. If no transaction is provided,
   * it starts a new transaction, executes the handler, and commits or rolls back based on the outcome.
   * @template R The return type of the handler.
   * @param existingTransaction The transaction to use (optional). Creates a new one otherwise.
   * @param handler The function to execute within the transaction.
   * @returns A promise that resolves to the result of the handler function.
   */
  async useTransaction<R>(existingTransaction: Transaction | undefined, handler: TransactionHandler<R>): Promise<R> {
    if (isUndefined(existingTransaction)) {
      return await this.transaction(handler);
    }

    return await (existingTransaction as DrizzleTransaction).use(async () => await handler(existingTransaction));
  }

  /**
   * Starts a new transaction, executes the provided handler function within it,
   * and automatically commits the transaction if the handler succeeds or rolls it back if it throws an error.
   * @template R The return type of the handler.
   * @param handler The function to execute within the transaction.
   * @param config Optional transaction configuration.
   * @returns A promise that resolves to the result of the handler function.
   */
  async transaction<R>(handler: TransactionHandler<R>, config?: TransactionInitOptions): Promise<R> {
    const transaction = await this.startTransaction(config);
    return await transaction.use(async () => await handler(transaction));
  }

  protected getTransactionalContextData(): ContextData {
    return transactionalContextDataGuard; // eslint-disable-line @typescript-eslint/no-unsafe-return
  }
}

export function tryGetTransactionalContextData<T>(_instance?: Transactional<T>): T | undefined {
  return getCurrentTransactionalContext()?.data as T | undefined;
}

export function getTransactionalContextData<T>(_instance?: Transactional<T>): T {
  return getCurrentTransactionalContext(true, getTransactionalContextData).data as T;
}

export function injectTransactional<T extends Transactional, A = unknown>(token: InjectionToken<T, A>, session?: Database | PgTransaction | null, argument?: ResolveArgument<T, A>): T {
  const transactional = inject(token, argument);

  if (isNull(session)) {
    return transactional;
  }

  const newSession = session ?? getCurrentTransactionalContext()?.session;

  if (isDefined(newSession) && (transactional.session != newSession)) {
    return transactional.withSession(newSession);
  }

  return transactional;
}
