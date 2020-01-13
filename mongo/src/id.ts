import { getRandomString } from "@tstdl/base/utils";

export function getNewDocumentId(): string {
  return getRandomString(15);
}
