import type * as NodeOs from 'node:os';
import type * as NodeWorkerThreads from 'node:worker_threads';
import { dynamicImport } from './import.js';
import { dynamicRequire } from './require.js';

declare const process: { versions?: { node?: string } } | undefined;
declare const Deno: { version?: { deno?: string } } | undefined;

export const isCjs = (typeof require == 'function') && (typeof module == 'object');
export const isEsm = !isCjs;

export const isBrowserWindow = (typeof window != 'undefined') && (typeof window.document != 'undefined');
export const isDedicatedWorker = checkIfIsWorker('DedicatedWorkerGlobalScope');
export const isSharedWorker = checkIfIsWorker('SharedWorkerGlobalScope');
export const isServiceWorker = checkIfIsWorker('ServiceWorkerGlobalScope');
export const isBrowserWorker = isDedicatedWorker || isSharedWorker || isServiceWorker;

export const isBrowser = isBrowserWindow || isBrowserWorker;
export const isNode = (typeof process == 'object') && (typeof process.versions?.node == 'string');
export const isNodeWorker = async (): Promise<boolean> => isNode && (await checkIfIsNodeWorkerThread());
export const isDeno = (typeof Deno == 'object') && (typeof Deno.version?.deno == 'string');
export const isWorker = async (): Promise<boolean> => isBrowserWorker || (await isNodeWorker());

export const hardwareConcurrency = isNode
  ? (isCjs ? (dynamicRequire<typeof NodeOs>('os')).cpus().length : undefined)
  : (globalThis as Partial<typeof globalThis>).navigator?.hardwareConcurrency;

function checkIfIsWorker(constructorName: string): boolean {
  return (typeof globalThis == 'object') && (globalThis.constructor.name == constructorName);
}

async function checkIfIsNodeWorkerThread(): Promise<boolean> {
  try {
    const nodeWorkerThreads = await dynamicImport<typeof NodeWorkerThreads>('nodeworker_threads');
    return !nodeWorkerThreads.isMainThread;
  }
  catch {
    return false;
  }
}
