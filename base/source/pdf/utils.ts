import { TemporaryFile } from '#/file/server/temporary-file.js';
import { spawnCommand } from '#/process/spawn.js';
import { isNotString, isString } from '#/utils/type-guards.js';

export async function getPdfPageCount(file: string | Uint8Array | ReadableStream<Uint8Array>): Promise<number> {
  const fileIsPath = isString(file);
  await using tmpFile = fileIsPath ? undefined : await TemporaryFile.from(file);
  const path = fileIsPath ? file : tmpFile!.path;

  const process = await spawnCommand('qpdf', ['--show-npages', path]);
  const { code } = await process.wait();

  if (code != 0) {
    const errorOutput = await process.readError();
    throw new Error(errorOutput.trim());
  }

  const output = await process.readOutput();
  return Number(output);
}

export async function mergePdfs(pdfs: (string | Uint8Array | ReadableStream<Uint8Array>)[]): Promise<Uint8Array> {
  await using stack = new AsyncDisposableStack();
  await using resultFile = TemporaryFile.create();

  const sourceFiles = await getPdfSourceFiles(pdfs, stack);
  await pdfunite(sourceFiles, resultFile);

  return await resultFile.read();
}

export async function mergePdfsStream(pdfs: (string | Uint8Array | ReadableStream<Uint8Array>)[]): Promise<ReadableStream<Uint8Array>> {
  await using stack = new AsyncDisposableStack();
  await using resultFile = TemporaryFile.create();

  const sourceFiles = await getPdfSourceFiles(pdfs, stack);
  await pdfunite(sourceFiles, resultFile);

  return resultFile.readStream();
}

async function getPdfSourceFiles(pdfs: (string | Uint8Array | ReadableStream<Uint8Array>)[], stack: AsyncDisposableStack) {
  return await Promise.all(
    pdfs.map(async (pdf) => {
      if (isString(pdf)) {
        return pdf;
      }

      const tmpFile = await TemporaryFile.from(pdf);
      stack.use(tmpFile);

      return tmpFile.path;
    })
  );
}

async function pdfunite(sourceFiles: string[], resultFile: TemporaryFile) {
  const process = await spawnCommand('pdfunite', [...sourceFiles, resultFile.path]);

  const { code } = await process.wait();

  if (code != 0) {
    const errorOutput = await process.readError();
    throw new Error(errorOutput);
  }
}

/**
 * Convert a PDF page to an image.
 * @param file The PDF file to convert.
 * @param page The page number to convert.
 * @param size The size of the output image.
 * @param format The format of the output image.
 * @returns The converted image as a byte array.
 */
export async function pdfToImage(file: string | Uint8Array | ReadableStream<Uint8Array>, page: number, size: number, format: 'png' | 'jpeg' | 'tiff' | 'ps' | 'eps' | 'pdf' | 'svg'): Promise<Uint8Array> {
  const path = isString(file) ? file : '-';

  const process = await spawnCommand(
    'pdftocairo',
    ['-f', String(page), '-l', String(page), '-scale-to', String(size), '-singlefile', `-${format}`, path, '-'],
  );

  process.handleNonZeroExitCode();

  if (isNotString(file)) {
    process.autoWrite(file);
  }

  return process.readOutputBytes();
}
