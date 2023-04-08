/**
 * Generates a random value in interval [0, 1).
 */
export type RandomNumberGeneratorFn = () => number;

export const defaultRandomNumberGeneratorFn: RandomNumberGeneratorFn = Math.random;
