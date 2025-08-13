import { eq, inArray } from 'drizzle-orm';
import { union } from 'drizzle-orm/pg-core';

import { CancellationSignal } from '#/cancellation/token.js';
import { inject } from '#/injector/inject.js';
import { afterResolve } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { MessageBus } from '#/message-bus/message-bus.js';
import { Database, tryGetTstdlTransaction, type PgTransaction, type Transaction } from '#/orm/server/index.js';
import type { OneOrMany } from '#/types/index.js';
import { toArray } from '#/utils/array/index.js';
import { cancelableTimeout } from '#/utils/timing.js';
import { isDefined } from '#/utils/type-guards.js';
import { documentAssignmentScope, documentAssignmentTask, documentCollectionAssignment, documentRequestCollectionAssignment, documentWorkflow } from '../schemas.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentManagementObservationService {
  readonly #database = inject(Database);
  readonly #cancellationSignal = inject(CancellationSignal);
  readonly #logger = inject(Logger, DocumentManagementObservationService.name);
  readonly #collectionIds = new Set<string>();
  readonly #documentIds = new Set<string>();
  readonly #workflowIds = new Set<string>();
  readonly #requestIds = new Set<string>();

  readonly collectionsChangedMessageBus = inject(MessageBus<string[]>, 'DocumentManagementObservation:collectionsChanged');

  [afterResolve](): void {
    this.notifyLoop();
  }

  collectionChange(ids: OneOrMany<string>, transactionOrSession?: Transaction | Database | PgTransaction): void {
    const transaction = tryGetTstdlTransaction(transactionOrSession);

    if (isDefined(transaction)) {
      transaction.afterCommit$.subscribe(() => this.collectionChange(ids));
    }
    else {
      for (const id of toArray(ids)) {
        this.#collectionIds.add(id);
      }
    }
  }

  documentChange(ids: OneOrMany<string>, transactionOrSession?: Transaction | Database | PgTransaction): void {
    const transaction = tryGetTstdlTransaction(transactionOrSession);

    if (isDefined(transaction)) {
      transaction.afterCommit$.subscribe(() => this.documentChange(ids));
    }
    else {
      for (const id of toArray(ids)) {
        this.#documentIds.add(id);
      }
    }
  }

  workflowChange(ids: OneOrMany<string>, transactionOrSession?: Transaction | Database | PgTransaction): void {
    const transaction = tryGetTstdlTransaction(transactionOrSession);

    if (isDefined(transaction)) {
      transaction.afterCommit$.subscribe(() => this.workflowChange(ids));
    }
    else {
      for (const id of toArray(ids)) {
        this.#workflowIds.add(id);
      }
    }
  }

  requestChange(ids: OneOrMany<string>, transactionOrSession?: Transaction | Database | PgTransaction): void {
    const transaction = tryGetTstdlTransaction(transactionOrSession);

    if (isDefined(transaction)) {
      transaction.afterCommit$.subscribe(() => this.requestChange(ids));
    }
    else {
      for (const id of toArray(ids)) {
        this.#requestIds.add(id);
      }
    }
  }

  private notifyLoop(): void {
    void (async () => {
      while (this.#cancellationSignal.isUnset) {
        try {
          if ((this.#collectionIds.size + this.#documentIds.size + this.#workflowIds.size + this.#requestIds.size) > 0) {
            const timeoutResult = await cancelableTimeout(50, this.#cancellationSignal);

            if (timeoutResult == 'canceled') {
              break;
            }

            await this.notify();
          }
        }
        catch (error) {
          this.#logger.error(error);
          await cancelableTimeout(2500, this.#cancellationSignal);
        }
        finally {
          await cancelableTimeout(100, this.#cancellationSignal);
        }
      }
    })();
  }

  private async notify(): Promise<void> {
    const collectionIds = Array.from(this.#collectionIds);
    const documentIds = Array.from(this.#documentIds);
    const workflowIds = Array.from(this.#workflowIds);
    const requestIds = Array.from(this.#requestIds);

    this.#collectionIds.clear();
    this.#documentIds.clear();
    this.#workflowIds.clear();
    this.#requestIds.clear();

    try {
      const documentCollectionIds = this.#database
        .selectDistinct({ collectionId: documentCollectionAssignment.collectionId })
        .from(documentCollectionAssignment)
        .where(inArray(documentCollectionAssignment.documentId, documentIds));

      const documentAssignmentTaskCollectionIds = this.#database
        .selectDistinct({ collectionId: documentAssignmentScope.collectionId })
        .from(documentAssignmentTask)
        .innerJoin(documentAssignmentScope, eq(documentAssignmentScope.taskId, documentAssignmentTask.id))
        .where(inArray(documentAssignmentTask.documentId, documentIds));

      const workflowDocumentCollectionIds = this.#database
        .selectDistinct({ collectionId: documentCollectionAssignment.collectionId })
        .from(documentWorkflow)
        .innerJoin(documentCollectionAssignment, eq(documentCollectionAssignment.documentId, documentWorkflow.documentId))
        .where(inArray(documentWorkflow.id, workflowIds));

      const workflowDocumentAssignmentTaskCollectionIds = this.#database
        .selectDistinct({ collectionId: documentAssignmentScope.collectionId })
        .from(documentWorkflow)
        .innerJoin(documentAssignmentTask, eq(documentAssignmentTask.documentId, documentWorkflow.documentId))
        .innerJoin(documentAssignmentScope, eq(documentAssignmentScope.taskId, documentAssignmentTask.id))
        .where(inArray(documentWorkflow.id, workflowIds));

      const requestCollectionIds = this.#database
        .selectDistinct({ collectionId: documentRequestCollectionAssignment.collectionId })
        .from(documentRequestCollectionAssignment)
        .where(inArray(documentRequestCollectionAssignment.requestId, requestIds));

      const result = await union(
        documentCollectionIds,
        documentAssignmentTaskCollectionIds,
        workflowDocumentCollectionIds,
        workflowDocumentAssignmentTaskCollectionIds,
        requestCollectionIds
      );

      const allCollectionIds = result.map((row) => row.collectionId);

      if (allCollectionIds.length > 0) {
        await this.collectionsChangedMessageBus.publish(allCollectionIds);
      }
    }
    catch (error) {
      for (const collectionId of collectionIds) {
        this.#collectionIds.add(collectionId);
      }

      for (const documentId of documentIds) {
        this.#documentIds.add(documentId);
      }

      for (const workflowId of workflowIds) {
        this.#workflowIds.add(workflowId);
      }

      for (const requestId of requestIds) {
        this.#requestIds.add(requestId);
      }

      throw error;
    }
  }
}
