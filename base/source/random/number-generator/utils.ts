export function random32BitSeed(): number {
  return Math.floor(Math.random() * (2 ** 32));
}
