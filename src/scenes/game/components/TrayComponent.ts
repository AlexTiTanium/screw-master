import { defineComponent } from '@shared/ecs';
import { ScrewColor } from '@shared/types';

/**
 * Component for colored tray entities.
 *
 * Stores the tray's color, capacity, and current screw count.
 * Screws of matching color are placed here when removed from parts.
 *
 * @example
 * const entity = createEntity(TrayEntity, {
 *   tray: { color: ScrewColor.Blue, capacity: 3 }
 * });
 */
export const TrayComponent = defineComponent('tray', {
  /** Tray color - only matching screws can be placed here */
  color: ScrewColor.Red as ScrewColor,
  /** Maximum number of screws this tray can hold */
  capacity: 3,
  /** Current number of screws in the tray */
  screwCount: 0,
  /** Whether the tray is hidden (under cover) */
  isHidden: false,
});

/** Data interface for TrayComponent */
export interface TrayComponentData {
  color: ScrewColor;
  capacity: number;
  screwCount: number;
  isHidden: boolean;
}
