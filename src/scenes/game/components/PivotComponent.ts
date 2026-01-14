import { defineComponent } from '@shared/ecs';
import type { Position } from '@shared/types';

/**
 * Component for tracking pivot physics state on parts.
 *
 * When a part has exactly 1 screw remaining, it can pivot around that
 * screw like a pendulum. This component tracks the pivot state and
 * configuration.
 *
 * @example
 * const entity = createEntity(PartEntity, {
 *   pivot: { isPivoting: true, pivotScrewEntityId: '123' }
 * });
 */
export const PivotComponent = defineComponent('pivot', {
  /** Whether the part is currently in pivoting state (1 screw remaining) */
  isPivoting: false,
  /** UID of the screw entity acting as pivot point (empty if not pivoting) */
  pivotScrewEntityId: '',
  /** World position of the pivot point */
  pivotPoint: { x: 0, y: 0 } as Position,
  /** Maximum rotation angle in radians (default ±180° for full rotation) */
  angleLimit: Math.PI,
  /** Whether the player is currently dragging this part */
  isDragging: false,
});

/** Data interface for PivotComponent */
export interface PivotComponentData {
  isPivoting: boolean;
  pivotScrewEntityId: string;
  pivotPoint: Position;
  angleLimit: number;
  isDragging: boolean;
}
