// ============================================
// @auditkit/sdk — Auto-batching Logic
// ============================================

import type { AuditEventInput } from '@auditkit/shared';

export interface BatchConfig {
  maxSize: number;
  flushInterval: number;
  maxQueueSize?: number;
  maxRetries?: number;
  onFlush: (events: AuditEventInput[]) => Promise<void>;
  onError?: (error: Error) => void;
}

const DEFAULT_MAX_QUEUE_SIZE = 10000;
const DEFAULT_MAX_RETRIES = 3;

export class BatchQueue {
  private queue: AuditEventInput[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private closed = false;
  private retryCount = 0;

  constructor(private config: BatchConfig) {
    this.startTimer();
  }

  private get maxQueueSize(): number {
    return this.config.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
  }

  private get maxRetries(): number {
    return this.config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async add(event: AuditEventInput): Promise<void> {
    if (this.closed) {
      throw new Error('BatchQueue is closed');
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`BatchQueue is full (max ${this.maxQueueSize} events)`);
    }

    this.queue.push(event);

    if (this.queue.length >= this.config.maxSize) {
      await this.flush();
    }
  }

  async addMany(events: AuditEventInput[]): Promise<void> {
    if (this.closed) {
      throw new Error('BatchQueue is closed');
    }

    if (this.queue.length + events.length > this.maxQueueSize) {
      throw new Error(`BatchQueue would exceed max size (max ${this.maxQueueSize} events)`);
    }

    // Use concat instead of spread to avoid call stack overflow on large arrays
    this.queue = this.queue.concat(events);

    if (this.queue.length >= this.config.maxSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;

    this.flushing = true;
    const batch = this.queue.splice(0, this.config.maxSize);

    try {
      await this.config.onFlush(batch);
      this.retryCount = 0;
    } catch (error) {
      const flushError = error instanceof Error ? error : new Error(String(error));
      this.retryCount++;
      // Always put events back at the front of the queue so callers can retry or inspect them.
      this.queue = batch.concat(this.queue);
      this.config.onError?.(flushError);

      if (this.retryCount > this.maxRetries) {
        throw flushError;
      }
    } finally {
      this.flushing = false;
    }

    // If there are still events queued, flush again
    if (this.queue.length >= this.config.maxSize && this.retryCount <= this.maxRetries) {
      await this.flush();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    this.stopTimer();

    while (this.queue.length > 0) {
      try {
        await this.flush();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to flush ${this.queue.length} queued events: ${message}`, {
          cause: error,
        });
      }
    }
  }

  get size(): number {
    return this.queue.length;
  }

  private startTimer(): void {
    if (this.config.flushInterval > 0) {
      this.timer = setInterval(() => {
        this.flush().catch((err) => {
          this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
        });
      }, this.config.flushInterval);

      // Don't prevent Node.js from exiting
      if (this.timer && typeof this.timer === 'object' && 'unref' in this.timer) {
        this.timer.unref();
      }
    }
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
