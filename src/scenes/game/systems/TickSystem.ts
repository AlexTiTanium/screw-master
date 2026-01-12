import type { Time } from '@play-co/odie';

import { BaseSystem } from './BaseSystem';
import { gameTick } from '../utils';
import { registerTickCounter } from '@shared/debug';

/**
 * System that increments the global tick counter each frame.
 *
 * This system should be registered first to ensure the tick counter
 * is updated before other systems run their update logic.
 *
 * The tick counter enables deterministic debug logging by providing
 * a frame reference for all log messages.
 *
 * @example
 * // Register in GameScene
 * scene.addSystem(TickSystem);
 *
 * // In other systems, use gameTick.log() for tick-prefixed logs
 * gameTick.log('TAP', `(${x}, ${y}) → ${color} screw`);
 */
export class TickSystem extends BaseSystem {
  static readonly NAME = 'tick';

  /** Whether the tick counter has been registered with test harness */
  private registered = false;

  /**
   * Update tick counter each frame.
   * @param _time - Frame time info (unused)
   * @example
   * system.update(time); // Called automatically by ECS
   */
  update(_time: Time): void {
    // Register gameTick with test harness on first update
    if (!this.registered) {
      registerTickCounter(gameTick);
      this.registered = true;
    }
    gameTick.update();
  }
}
