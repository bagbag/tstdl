export function tryIgnore(fn: () => any): void {
  try {
    fn();
  }
  catch { /* ignore */ }
}

export async function tryIgnoreAsync(fn: () => Promise<any>): Promise<void> {
  try {
    await fn();
  }
  catch { /* ignore */ }
}
