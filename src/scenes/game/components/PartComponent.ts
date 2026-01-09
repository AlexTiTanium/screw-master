import { defineComponent } from '@shared/ecs';

/**
 * Part state types.
 */
export type PartState = 'static' | 'constrained' | 'free';

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
