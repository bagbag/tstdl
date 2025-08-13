import type { OneOrMany } from '#/types/index.js';
import { isDefined, isString } from '#/utils/type-guards.js';

export type FileSelectDialogOptions = {
  accept?: OneOrMany<string>,
  multiple?: boolean,
  capture?: string
};

export async function openFileSelectDialog({ accept, multiple, capture }: FileSelectDialogOptions = {}): Promise<File[] | null> {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';

  if (isDefined(accept)) {
    fileInput.accept = isString(accept) ? accept : accept.join(',');
  }

  if (isDefined(multiple)) {
    fileInput.multiple = multiple;
  }

  if (isDefined(capture)) {
    fileInput.capture = capture;
  }

  fileInput.click();

  return new Promise<File[] | null>((resolve) => {
    fileInput.addEventListener('change', () => resolve(Array.from(fileInput.files ?? [])));
    fileInput.addEventListener('cancel', () => resolve(null));
  });
}
