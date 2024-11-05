import { millisecondsPerSecond } from '#/utils/units.js';

export type DownloadFileOptions = {
  fileName?: string
};

export function downloadFile(content: Blob | File, fileName?: string): void {
  const a = document.createElement('a');
  const url = URL.createObjectURL(content);

  a.style.display = 'none';
  a.download = fileName ?? ((content instanceof File) ? content.name : '');
  a.href = url;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10 * millisecondsPerSecond);
}
