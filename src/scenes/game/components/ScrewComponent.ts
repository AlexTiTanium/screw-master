import { defineComponent } from '@shared/ecs';
import { ScrewColor } from '@shared/types';

/**
 * Screw state types.
 */
export type ScrewState = 'inBoard' | 'inTray' | 'inBuffer' | 'dragging';

/**
 * Component for screw entities.
 *
 * Stores the screw's color, state, and relationship to its parent part.
 *
 * @example
 * const entity = createEntity(ScrewEntity, {
 *   screw: { color: ScrewColor.Red, mountId: 'top-left' }
 * });
 */
export const ScrewComponent = defineComponent('screw', {
  /** Screw color - determines which tray it goes to */
  color: ScrewColor.Red as ScrewColor,
  /** ID of the parent part entity (empty string if removed) */
  partEntityId: '',
  /** ID of the mount point on the part */
  mountId: '',
  /** Current state of the screw */
  state: 'inBoard' as ScrewState,
});

/** Data interface for ScrewComponent */
export interface ScrewComponentData {
  color: ScrewColor;
  partEntityId: string;
  mountId: string;
  state: ScrewState;
}
