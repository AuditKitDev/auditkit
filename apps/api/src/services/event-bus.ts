/**
 * Simple in-memory pub/sub event bus for real-time SSE streaming.
 * Each project has its own set of subscribers.
 */

export interface PublishedEvent {
  id: string;
  event_id: string;
  action: string;
  severity: string;
  tenant_id: string;
  actor: {
    id: string;
    type: string;
    name: string | null;
    email: string | null;
  };
  target: {
    type: string | null;
    id: string | null;
    name: string | null;
  } | null;
  occurred_at: string;
  ingested_at: string;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

type Subscriber = (event: PublishedEvent) => void;

class EventBus {
  private subscribers = new Map<string, Set<Subscriber>>();

  /**
   * Publish an event to all subscribers of a project.
   */
  publish(projectId: string, event: PublishedEvent): void {
    const subs = this.subscribers.get(projectId);
    if (!subs || subs.size === 0) return;

    for (const callback of subs) {
      try {
        callback(event);
      } catch {
        // Don't let a failing subscriber break others
      }
    }
  }

  /**
   * Subscribe to events for a project.
   * Returns an unsubscribe function.
   */
  subscribe(projectId: string, callback: Subscriber): () => void {
    let subs = this.subscribers.get(projectId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(projectId, subs);
    }

    subs.add(callback);

    // Return unsubscribe function
    return () => {
      subs!.delete(callback);
      // Clean up empty sets to prevent memory leaks
      if (subs!.size === 0) {
        this.subscribers.delete(projectId);
      }
    };
  }

  /**
   * Get number of active subscribers for a project (for diagnostics).
   */
  subscriberCount(projectId: string): number {
    return this.subscribers.get(projectId)?.size ?? 0;
  }
}

// Singleton instance
export const eventBus = new EventBus();
