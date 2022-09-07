declare const process: { versions?: { node?: string } } | undefined;
declare const Deno: { version?: { deno?: string } } | undefined;
// declare const worker_threads: {} | undefined;

export const isBrowserWindow = (typeof window != 'undefined') && (typeof window.document != 'undefined');
export const isDedicatedWorker = checkIfIsWorker('DedicatedWorkerGlobalScope');
export const isSharedWorker = checkIfIsWorker('SharedWorkerGlobalScope');
export const isServiceWorker = checkIfIsWorker('ServiceWorkerGlobalScope');
export const isBrowserWorker = isDedicatedWorker || isSharedWorker || isServiceWorker;

export const isBrowser = isBrowserWindow || isBrowserWorker;
export const isNode = (typeof process == 'object') && (typeof process.versions?.node == 'string');
export const isNodeWorker = isNode && checkIfIsNodeWorkerThread();
export const isDeno = (typeof Deno == 'object') && (typeof Deno.version?.deno == 'string');
export const isWorker = isBrowserWorker || isNodeWorker;


function checkIfIsWorker(constructorName: string): boolean {
  return (typeof globalThis == 'object') && globalThis.constructor.name == constructorName;
}

function checkIfIsNodeWorkerThread(): boolean {
  try {
    return (typeof require == 'function') && !(require('worker_threads') as typeof import('worker_threads')).isMainThread;
  }
  catch {
    return false;
  }
}
