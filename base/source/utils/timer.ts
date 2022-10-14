const nsPerSec = 1e9;
const nsPerMs = 1e6;
const nsPerUs = 1e3;

let getBegin: () => any;
let getDuration: (begin: any) => number;

if ((typeof process == 'object') && (typeof process.hrtime == 'function')) {
  getBegin = () => process.hrtime();
  getDuration = (begin: [number, number]) => {
    const [secondsDiff, nanosecondsDiff] = process.hrtime(begin);
    const nanoseconds = (secondsDiff * nsPerSec) + nanosecondsDiff;

    return nanoseconds;
  };
}
else if ((typeof performance != 'undefined') && (typeof performance.now == 'function')) {
  getBegin = () => performance.now();
  getDuration = (begin: number) => (performance.now() - begin) * nsPerMs;
}
else {
  getBegin = () => Date.now();
  getDuration = (begin: number) => (Date.now() - begin) * nsPerMs;
}

export class Timer {
  private elapsedNanoseconds: number;
  private begin?: any;

  constructor(start: boolean = false) {
    this.elapsedNanoseconds = 0;

    if (start) {
      this.start();
    }
  }

  static measure(func: () => any): number {
    const timer = new Timer(true);
    func();

    return timer.milliseconds;
  }

  static async measureAsync(func: () => Promise<any>): Promise<number> {
    const timer = new Timer(true);
    await func();

    return timer.milliseconds;
  }

  start(): void {
    if (this.begin == undefined) {
      this.begin = getBegin();
    }
  }

  stop(): void {
    if (this.begin != undefined) {
      const nanoseconds = this.read();
      this.elapsedNanoseconds += nanoseconds;
      this.begin = undefined;
    }
  }

  restart(): void {
    this.reset();
    this.start();
  }

  reset(): void {
    this.begin = undefined;
    this.elapsedNanoseconds = 0;
  }

  get nanoseconds(): number {
    const result = this.elapsedNanoseconds + this.read();
    return result;
  }

  get microseconds(): number {
    return this.nanoseconds / nsPerUs;
  }

  get milliseconds(): number {
    return this.nanoseconds / nsPerMs;
  }

  get seconds(): number {
    return this.nanoseconds / nsPerSec;
  }

  private read(): number {
    if (this.begin == undefined) {
      return 0;
    }

    const result = getDuration(this.begin);
    return result;
  }
}
