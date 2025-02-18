import { clamp } from './math.js';
import { noop } from './noop.js';
import { Timer } from './timer.js';

let microsecondsPerTimerRead = 0;

export type BenchmarkResult = { operationsPerMillisecond: number, millisecondsPerOperation: number };

/**
 * measure the timer overhead for more precise benchmarks
 *
 * only relevant for benchmarked functions with a execution time in the range of microseconds
 * @param duration fow how long to measure the overhead in milliseconds (default 250)
 */
export function measureBenchmarkOverhead(duration: number = 250): void {
  const timer = new Timer(true);
  const warmupDuration = clamp(duration / 2, 50, 500);
  const testDuration = Math.max(duration - warmupDuration, 50);

  let operations = 0;
  let warmupPhase = true;

  let warmupFunction = (): void => {
    if (warmupPhase && timer.milliseconds >= warmupDuration) {
      warmupPhase = false;
      operations = 0;
      warmupFunction = noop;
      timer.restart();
    }
  };

  timer.start();
  do {
    warmupFunction();
    operations++;
  }
  while (timer.milliseconds < testDuration || warmupPhase); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
  timer.stop();

  microsecondsPerTimerRead = timer.microseconds / operations;
}

/**
 * benchmarks a function for a number of times
 * @param runs how often to run the benchmarked function
 * @param fn the function to benchmark
 * @param warmupDuration run the function for specified duration in milliseconds to warm it up
 */
export function benchmark(runs: number, fn: (run: number) => any, warmupDuration: number = 500): BenchmarkResult {
  warmup(fn, warmupDuration);

  const timer = new Timer(true);

  for (let run = 1; run <= runs; run++) {
    fn(run);
  }

  return calculateResult(runs, timer.milliseconds);
}

/**
 * benchmarks a function for a duration
 *
 * hint: run measureTimerOverhead before benchmark for more precise results
 * @param milliseconds for how long to benchmark the function
 * @param fn the function to benchmark
 * @param warmupDuration run the function for specified duration in milliseconds to warm it up
 */
export function timedBenchmark(milliseconds: number, fn: (run: number) => any, warmupDuration: number = 500): BenchmarkResult {
  warmup(fn, warmupDuration);

  const timer = new Timer(true);

  let runs = 0;
  do {
    runs++;
    fn(runs);
  }
  while (timer.milliseconds < milliseconds);

  return calculateTimedResult(runs, timer.milliseconds);
}

/**
 * benchmarks an async function for a number of times
 * @param runs how often to run the benchmarked function
 * @param fn the function to benchmark
 * @param warmupDuration run the function for specified duration in milliseconds to warm it up
 */
export async function benchmarkAsync(runs: number, fn: (run: number) => Promise<any>, warmupDuration: number = 500): Promise<BenchmarkResult> {
  await warmupAsync(fn, warmupDuration);

  const timer = new Timer(true);

  for (let run = 1; run <= runs; run++) {
    await fn(run);
  }

  return calculateResult(runs, timer.milliseconds);
}

/**
 * benchmarks an async function for a duration
 *
 * hint: run measureTimerOverhead before benchmark for more precise results
 * @param milliseconds for how long to benchmark the function
 * @param fn the function to benchmark
 * @param warmupDuration run the function for specified duration in milliseconds to warm it up
 */
export async function timedBenchmarkAsync(milliseconds: number, fn: (run: number) => Promise<any>, warmupDuration: number = 500): Promise<BenchmarkResult> {
  await warmupAsync(fn, warmupDuration);

  const timer = new Timer(true);

  let runs = 0;
  do {
    runs++;
    await fn(runs);
  }
  while (timer.milliseconds < milliseconds);

  return calculateTimedResult(runs, timer.milliseconds);
}

function calculateTimedResult(runs: number, time: number): BenchmarkResult {
  const correctedTime = time - (microsecondsPerTimerRead * runs / 1000);
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

function warmup(fn: (runs: number) => any, duration: number): void {
  if (duration <= 0) {
    return;
  }

  const timer = new Timer(true);

  let runs = 0;
  while (timer.milliseconds < duration) {
    fn(++runs);
  }
}

async function warmupAsync(fn: (runs: number) => Promise<any>, duration: number): Promise<void> {
  if (duration <= 0) {
    return;
  }

  const timer = new Timer(true);

  let runs = 0;
  while (timer.milliseconds < duration) {
    await fn(++runs);
  }
}
