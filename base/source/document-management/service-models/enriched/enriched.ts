import { match, P } from 'ts-pattern';

import { reduce } from '#/utils/iterable-helpers/index.js';
import { _throw } from '#/utils/throw.js';
import type { DocumentManagementData, DocumentRequestView } from '../document-management.view-model.js';
import { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';
import type { EnrichedDocumentRequest } from './enriched-document-request.view.js';

export type RequestsStats = {
  /** Open without document */
  open: number,

  /** Open with pending approval */
  pending: number,

  /** Closed without document */
  closed: number,

  /** Closed with rejected document */
  rejected: number,

  /** Fulfilled with approved document */
  fulfilled: number,
};

export function toEnrichedDocumentManagementData(data: DocumentManagementData): EnrichedDocumentManagementData {
  return new EnrichedDocumentManagementData(data);
}

export function calculateRequestsStats(requests: Iterable<DocumentRequestView | EnrichedDocumentRequest>): RequestsStats {
  let open = 0;
  let pending = 0;
  let closed = 0;
  let rejected = 0;
  let fulfilled = 0;

  for (const request of requests) {
    match(request)
      .with({ state: 'open', document: null }, () => open++)
      .with({ state: 'open', document: P.nonNullable }, () => pending++)
      .with({ state: 'closed', document: null }, () => closed++)
      .with({ state: 'closed', document: { approval: 'rejected' } }, () => rejected++)
      .with({ state: 'fulfilled', document: { approval: 'approved' } }, () => fulfilled++)
      .otherwise(() => _throw('Invalid request state'));
  }

  return {
    open,
    pending,
    closed,
    rejected,
    fulfilled,
  };
}

export function mergeRequestsStats(stats: Iterable<RequestsStats>): RequestsStats {
  return {
    open: reduce(stats, (a, b) => a + b.open, 0),
    pending: reduce(stats, (a, b) => a + b.pending, 0),
    closed: reduce(stats, (a, b) => a + b.closed, 0),
    rejected: reduce(stats, (a, b) => a + b.rejected, 0),
    fulfilled: reduce(stats, (a, b) => a + b.fulfilled, 0),
  };
}
