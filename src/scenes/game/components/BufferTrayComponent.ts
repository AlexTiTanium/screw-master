import { defineComponent } from '@shared/ecs';

/**
 * Component for the buffer tray entity.
 *
 * The buffer tray holds screws temporarily when the matching colored tray
 * is full. Screws are auto-transferred when space becomes available.
 *
 * @example
 * const entity = createEntity(BufferTrayEntity, {
 *   bufferTray: { capacity: 5 }
 * });
 */
export const BufferTrayComponent = defineComponent('bufferTray', {
  /** Maximum number of screws the buffer can hold */
  capacity: 5,
  /** IDs of screws in FIFO order for auto-transfer */
  screwIds: [] as string[],
});

/** Data interface for BufferTrayComponent */
export interface BufferTrayComponentData {
  capacity: number;
  screwIds: string[];
}
