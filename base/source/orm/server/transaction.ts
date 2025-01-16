import { DeferredPromise } from '#/promise/deferred-promise.js';
import type { PgTransaction as DrizzlePgTransaction, PgTransactionConfig } from 'drizzle-orm/pg-core';
import { Subject } from 'rxjs';
import type { Database } from './database.js';

type PgTransaction = DrizzlePgTransaction<any, any, any>;

export type TransactionConfig = PgTransactionConfig;

export abstract class Transaction {
  readonly #afterCommitSubject = new Subject<void>();

  #useCounter = 0;
  #done = false;

  readonly afterCommit$ = this.#afterCommitSubject.asObservable();

  manualCommit: boolean = false;

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

  rollback(): void {
    this.#done = true;
    this._rollback();
  }

  protected abstract _commit(): Promise<void>;
  protected abstract _rollback(): void;
}

export class DrizzleTransaction extends Transaction {
  readonly transaction: PgTransaction;
  readonly deferPromise = new DeferredPromise();
  readonly pgTransactionPromise: Promise<void>;

  constructor(transaction: PgTransaction, pgTransactionPromise: Promise<void>) {
    super();

    this.transaction = transaction;
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
      config
    );

    pgTransactionPromise.catch((error: Error) => {
      if (transactionPromise.pending) {
        transactionPromise.reject(error);
      }
    });

    return transactionPromise;
  }

  protected async _commit(): Promise<void> {
    this.deferPromise.resolve();
    await this.pgTransactionPromise;
  }

  protected _rollback(): void {
    try {
      this.transaction.rollback();
    }
    catch (error) {
      this.deferPromise.reject(error);
    }
  }
}
