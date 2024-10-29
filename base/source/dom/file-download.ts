export type DownloadFileOptions = {
  fileName?: string
};

export function downloadFile(content: Blob, fileName?: string): void {
  const a = document.createElement('a');
  const url = URL.createObjectURL(content);

  a.style.display = 'none';
  a.download = fileName ?? '';
  a.href = url;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
