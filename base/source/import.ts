export async function dynamicImport<T = any>(id: string): Promise<T> {
  return import(/* @vite-ignore */ id) as Promise<T>;
}
