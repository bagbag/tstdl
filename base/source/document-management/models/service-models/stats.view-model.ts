import { NumberProperty } from '#/schema/index.js';

export class RequestFilesStats {
  @NumberProperty()
  requiredFilesCount: number;

  @NumberProperty()
  requiredFilesLeft: number;

  @NumberProperty()
  pendingFilesCount: number;

  @NumberProperty()
  approvedFilesCount: number;
}
