import { defineComponent } from '@shared/ecs';
import { ScrewColor } from '@shared/types';

/**
 * Component for colored tray entities.
 *
 * Stores the tray's color, capacity, and current screw count.
 * Screws of matching color are placed here when removed from parts.
 *
 * The displayOrder property (0-4) determines visibility:
 * - 0-1: Visible trays in left-to-right order
 * - 2-4: Hidden trays (below the visible area, covered)
 *
 * @example
 * const entity = createEntity(TrayEntity, {
 *   tray: { color: ScrewColor.Blue, capacity: 3, displayOrder: 0 }
 * });
 */
export const TrayComponent = defineComponent('tray', {
  /** Tray color - only matching screws can be placed here */
  color: ScrewColor.Red as ScrewColor,
  /** Maximum number of screws this tray can hold */
  capacity: 3,
  /** Current number of screws in the tray */
  screwCount: 0,
  /** Display order (0-4): 0-1 are visible, 2-4 are hidden */
  displayOrder: 0,
  /** Whether the tray is currently animating (block interactions) */
  isAnimating: false,
});

/** Data interface for TrayComponent */
export interface TrayComponentData {
  color: ScrewColor;
  capacity: number;
  screwCount: number;
  displayOrder: number;
  isAnimating: boolean;
}
