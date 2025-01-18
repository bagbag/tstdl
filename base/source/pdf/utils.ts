import { spawnCommand } from '#/process/spawn.js';

export async function getPdfPageCount(file: string): Promise<number> {
  const process = await spawnCommand('qpdf', ['--show-npages', file]);

  const { code } = await process.wait();

  if (code != 0) {
    const errorOutput = await process.readError();
    throw new Error(errorOutput.trim());
  }

  const output = await process.readOutput();
  return Number(output);
}
