import { getGetter } from './helpers';
import { Timer } from './timer';

const millisecondsPerTimerRead = measureTimerOverhead(3);

export type BenchmarkResult = { operationsPerMillisecond: number, millisecondsPerOperation: number };

export function benchmark<F extends (...args: any[]) => any>(runs: number, func: F, ...parameters: Parameters<F>): BenchmarkResult {
  const timer = new Timer(true);

  for (let i = 0; i < runs; i++) {
    func(...parameters);
  }

  return calculateResult(runs, timer.milliseconds);
}

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

export async function benchmarkAsync<F extends (...args: any[]) => Promise<any>>(runs: number, func: F, ...parameters: Parameters<F>): Promise<BenchmarkResult> {
  const timer = new Timer(true);

  for (let i = 0; i < runs; i++) {
    await func(...parameters);
  }

  return calculateResult(runs, timer.milliseconds);
}

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

function measureTimerOverhead(runs: number): number {
  const timer = new Timer(true);
  const millisecondsGetter = getGetter(timer, 'milliseconds', true);

  const results: number[] = [];

  // runs + 1 because first is skipped as warmup
  for (let i = 0; i < (runs + 1); i++) {
    const result = benchmark(1000000, millisecondsGetter);

    if (i > 0) {
      results.push(result.millisecondsPerOperation);
    }
  }

  const sum = results.reduce((previous, current) => previous + current, 0);
  const average = sum / results.length;

  return average;
}
