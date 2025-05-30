import { NumberProperty } from '#/schema/index.js';

export class RequestStats {
  @NumberProperty()
  total: number;

  @NumberProperty()
  documentPending: number;

  @NumberProperty()
  approvalPending: number;

  @NumberProperty()
  approvals: number;

  @NumberProperty()
  rejections: number;

  @NumberProperty()
  closedWithoutDocument: number;
}
