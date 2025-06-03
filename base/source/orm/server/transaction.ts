import { PgTransaction as DrizzlePgTransaction, type PgQueryResultHKT, type PgTransactionConfig } from 'drizzle-orm/pg-core';
import { Subject } from 'rxjs';

import { DeferredPromise } from '#/promise/deferred-promise.js';
import type { Record } from '#/types.js';
import type { Database } from './database.js';

export type PgTransaction = DrizzlePgTransaction<PgQueryResultHKT, Record, Record>;
export { DrizzlePgTransaction };

export type TransactionConfig = PgTransactionConfig;

export abstract class Transaction implements AsyncDisposable {
  readonly #afterCommitSubject = new Subject<void>();

  #useCounter = 0;
  #done = false;

  readonly afterCommit$ = this.#afterCommitSubject.asObservable();

  manualCommit: boolean = false;

  async [Symbol.asyncDispose](): Promise<void> {
    if (!this.#done) {
      await this.rollback();
    }
  }

  withManualCommit(): void {
    this.manualCommit = true;
  }

  /**
   * Enters automatic transaction handling. Transaction will be commited when all use-calls are done or rolled back when one throws.
   */
  async use<T>(handler: () => Promise<T>): Promise<T> {
    this.#useCounter++;

    try {
      return await handler();
    }
    finally {
      this.#useCounter--;

      if ((this.#useCounter == 0) && !this.#done && !this.manualCommit) {
        await this.commit();
      }
    }
  }

  async commit(): Promise<void> {
    this.#done = true;
    await this._commit();

    this.#afterCommitSubject.next();
    this.#afterCommitSubject.complete();
  }

  async rollback(): Promise<void> {
    this.#done = true;
    this.#afterCommitSubject.complete();

    await this._rollback();
  }

  protected abstract _commit(): void | Promise<void>;
  protected abstract _rollback(): void | Promise<void>;
}

export class DrizzleTransaction extends Transaction {
  readonly pgTransaction: PgTransaction;
  readonly deferPromise = new DeferredPromise();
  readonly pgTransactionPromise: Promise<void>;

  constructor(pgTransaction: PgTransaction, pgTransactionPromise: Promise<void>) {
    super();

    this.pgTransaction = pgTransaction;
    this.pgTransactionPromise = pgTransactionPromise;
  }

  static async create(session: Database | PgTransaction, config?: TransactionConfig): Promise<DrizzleTransaction> {
    const transactionPromise = new DeferredPromise<DrizzleTransaction>();

    const pgTransactionPromise = session.transaction(
      async (tx) => {
        const transaction = new DrizzleTransaction(tx, pgTransactionPromise);
        transactionPromise.resolve(transaction);

        await transaction.deferPromise;
      },
      config,
    );

    pgTransactionPromise.catch((error: unknown) => {
      if (transactionPromise.pending) {
        transactionPromise.reject(error as Error);
      }
    });

    return await transactionPromise;
  }

  protected async _commit(): Promise<void> {
    this.deferPromise.resolve();
    await this.pgTransactionPromise;
  }

  protected _rollback(): void {
    try {
      this.pgTransaction.rollback();
    }
    catch (error) {
      this.deferPromise.reject(error as Error);
    }
  }
}
