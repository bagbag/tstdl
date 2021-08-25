import { getGetter } from './object';
import { Timer } from './timer';

let millisecondsPerTimerRead = 0;

export type BenchmarkResult = { operationsPerMillisecond: number, millisecondsPerOperation: number };

/**
 * measure the timer overhead for more precise benchmarks
 *
 * only relevant for benchmarked functions with a execution time in the range of microseconds
 * @param duration fow how long to measure the overhead
 * @param warmupRounds how often to measure the overhead without counting its time
 */
export function measureBenchmarkOverhead(duration: number = 500, warmupRounds: number = 1000): void {
  const timer = new Timer(false);
  const millisecondsGetter = getGetter(timer, 'milliseconds', true);

  let operations = 0;

  // warmup
  for (let i = 0; i < warmupRounds; i++) {
    millisecondsGetter();
  }

  timer.start();
  do {
    for (let i = 0; i < 1000; i++) {
      void timer.milliseconds;
    }

    operations += 1000;
  }
  while (timer.milliseconds < duration);
  timer.stop();

  millisecondsPerTimerRead = timer.milliseconds / operations;
}

/**
 * benchmarks a function for a number of times
 * @param runs how often to run the benchmarked function
 * @param func the function to benchmark
 * @param parameters parameters passed to the function
 */
export function benchmark<F extends (...args: any[]) => any>(runs: number, func: F, ...parameters: Parameters<F>): BenchmarkResult {
  const timer = new Timer(true);

  for (let i = 0; i < runs; i++) {
    func(...parameters);
  }

  return calculateResult(runs, timer.milliseconds);
}

/**
 * benchmarks a function for a duration
 *
 * hint: run measureTimerOverhead before benchmark for more precise results
 * @param milliseconds for how long to benchmark the function
 * @param func the function to benchmark
 * @param parameters parameters passed to the function
 */
export function timedBenchmark<F extends (...args: any[]) => any>(milliseconds: number, func: F, ...parameters: Parameters<F>): BenchmarkResult {
  const timer = new Timer(true);

  let runs = 0;
  do {
    func(...parameters);
    runs++;
  }
  while (timer.milliseconds < milliseconds);

  return calculateTimedResult(runs, timer.milliseconds);
}

/**
 * benchmarks an async function for a number of times
 * @param runs how often to run the benchmarked function
 * @param func the function to benchmark
 * @param parameters parameters passed to the function
 */
export async function benchmarkAsync<F extends (...args: any[]) => Promise<any>>(runs: number, func: F, ...parameters: Parameters<F>): Promise<BenchmarkResult> {
  const timer = new Timer(true);

  for (let i = 0; i < runs; i++) {
    await func(...parameters);
  }

  return calculateResult(runs, timer.milliseconds);
}

/**
 * benchmarks an async function for a duration
 *
 * hint: run measureTimerOverhead before benchmark for more precise results
 * @param milliseconds for how long to benchmark the function
 * @param func the function to benchmark
 * @param parameters parameters passed to the function
 */
export async function timedBenchmarkAsync<F extends (...args: any[]) => Promise<any>>(milliseconds: number, func: F, ...parameters: Parameters<F>): Promise<BenchmarkResult> {
  const timer = new Timer(true);

  let runs = 0;
  do {
    await func(...parameters);
    runs++;
  }
  while (timer.milliseconds < milliseconds);

  return calculateTimedResult(runs, timer.milliseconds);
}

function calculateTimedResult(runs: number, time: number): BenchmarkResult {
  const correctedTime = time - (millisecondsPerTimerRead * runs);
  return calculateResult(runs, correctedTime);
}

function calculateResult(runs: number, time: number): BenchmarkResult {
  const operationsPerMillisecond = runs / time;
  const millisecondsPerOperation = time / runs;

  return {
    operationsPerMillisecond,
    millisecondsPerOperation
  };
}
