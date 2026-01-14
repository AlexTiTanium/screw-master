import { defineComponent } from '@shared/ecs';

/**
 * Part state types.
 *
 * - 'static': Part is fully fixed (3+ screws attached)
 * - 'loosened': Part has slight play (2 screws attached)
 * - 'pivoting': Part can swing around remaining screw (1 screw attached)
 * - 'free': Part falls with gravity (0 screws attached)
 */
export type PartState = 'static' | 'loosened' | 'pivoting' | 'free';

/**
 * Component for part/board entities.
 *
 * Stores the part's definition reference, layer order, and state.
 *
 * @example
 * const entity = createEntity(PartEntity, {
 *   part: { partDefinitionId: 'board-walnut-square', layer: 1 }
 * });
 */
export const PartComponent = defineComponent('part', {
  /** ID referencing the PartDefinition in the registry */
  partDefinitionId: '',
  /** Z-order layer for occlusion (higher = on top) */
  layer: 0,
  /** Number of screws currently attached */
  screwCount: 0,
  /** Current movement state */
  state: 'static' as PartState,
});

/** Data interface for PartComponent */
export interface PartComponentData {
  partDefinitionId: string;
  layer: number;
  screwCount: number;
  state: PartState;
}
