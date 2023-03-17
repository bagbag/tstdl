export async function dynamicImport<T = any>(id: string): Promise<T> {
  return import(id);
}
