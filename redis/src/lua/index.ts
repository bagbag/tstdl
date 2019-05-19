import { createHash } from '@common-ts/server/utils';
import { readFileSync } from 'fs';

export const { script: dequeueLuaScript, sha: dequeueLuaScriptSha } = load('dequeue.lua');

function load(file: string): { script: string, sha: string } {
  const script = readFileSync(`${__dirname}/${file}`, { encoding: 'utf8' }).trim();
  const sha = createHash('sha1', script, 'utf8').toHex();

  return { script, sha };
}
