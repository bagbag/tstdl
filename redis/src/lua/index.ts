import { createHash } from '@tstdl/server/utils';
import { readFileSync } from 'fs';

export const { script: dequeueLuaScript, sha: dequeueLuaScriptSha } = load('dequeue.lua');
export const { script: retryLuaScript, sha: retryLuaScriptSha } = load('retry.lua');
export const { script: lockAcquireLuaScript, sha: lockAcquireLuaScriptSha } = load('lock-acquire.lua');
export const { script: lockOwnedLuaScript, sha: lockOwnedLuaScriptSha } = load('lock-owned.lua');
export const { script: lockRefreshLuaScript, sha: lockRefreshLuaScriptSha } = load('lock-refresh.lua');
export const { script: lockReleaseLuaScript, sha: lockReleaseLuaScriptSha } = load('lock-release.lua');

function load(file: string): { script: string, sha: string } {
  const script = readFileSync(`${__dirname}/${file}`, { encoding: 'utf8' }).trim().replace(/\n+/g, '\n').replace(/( |\t)+/g, ' ');
  const sha = createHash('sha1', script, 'utf8').toHex();

  return { script, sha };
}
