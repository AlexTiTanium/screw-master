/**
 * Simple event bus for game events.
 *
 * Provides a centralized pub/sub mechanism for game systems to communicate
 * without direct dependencies.
 *
 * @example
 * // Subscribe to an event
 * gameEvents.on('screw:startRemoval', (data) => {
 *   console.log('Screw removal started', data);
 * });
 *
 * // Emit an event
 * gameEvents.emit('screw:startRemoval', { screwEntity, targetTray });
 *
 * // Unsubscribe
 * gameEvents.off('screw:startRemoval', handler);
 */

type EventHandler<T = unknown> = (data: T) => void;

class GameEventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event.
   *
   * @param event - Event name
   * @param handler - Handler function
   * @example
   * gameEvents.on('screw:removed', (data) => console.log(data));
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): void {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler as EventHandler);
  }

  /**
   * Unsubscribe from an event.
   *
   * @param event - Event name
   * @param handler - Handler function to remove
   * @example
   * gameEvents.off('screw:removed', myHandler);
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  /**
   * Emit an event to all subscribers.
   *
   * @param event - Event name
   * @param data - Event data
   * @example
   * gameEvents.emit('screw:removed', { screwId: '123' });
   */
  emit(event: string, data?: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  /**
   * Remove all listeners for a specific event or all events.
   *
   * @param event - Optional event name. If omitted, clears all listeners.
   * @example
   * gameEvents.clear('screw:removed'); // Clear specific event
   * gameEvents.clear(); // Clear all events
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/** Singleton instance for game events */
export const gameEvents = new GameEventBus();
