export interface LoopController {
  stopped: Promise<void>;
  stop(): Promise<void>;
}
