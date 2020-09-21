import { getGetter } from './helpers';
import { Timer } from './timer';

let millisecondsPerTimerRead = 0;

export type BenchmarkResult = { operationsPerMillisecond: number, millisecondsPerOperation: number };

export function measureTimerOverhead(): void {
  const timer = new Timer(false);
  const millisecondsGetter = getGetter(timer, 'milliseconds', true);

  let operations = 0;

  timer.start();
  do {
    for (let i = 0; i < 1000; i++) {
      millisecondsGetter();
    }

    operations += 1000;
  }
  while (timer.milliseconds < 500);
  timer.stop();

  millisecondsPerTimerRead = timer.milliseconds / operations;
}

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
