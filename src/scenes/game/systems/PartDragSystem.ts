/**
 * PartDragSystem - Handles touch interaction for loosened and pivoting parts.
 *
 * This system:
 * - Attaches TouchInput to parts when they enter 'loosened' or 'pivoting' state
 * - Emits drag events (part:dragStart, part:dragMove, part:dragEnd)
 * - Removes TouchInput when part becomes 'free'
 *
 * Works in conjunction with PivotPhysicsSystem which handles the actual
 * physics joint manipulation based on these drag events.
 *
 * @example
 * // System registration (after PartStateSystem)
 * scene.addSystem(PartDragSystem);
 *
 * @module
 */

import type { Time, Entity, Entity2D } from '@play-co/odie';
import { TouchInput, type InputEvent } from '@play-co/astro';
import type { Container } from 'pixi.js';

import {
  PartComponent,
  PivotComponent,
  PhysicsBodyComponent,
} from '../components';
import { gameEvents } from '../utils';

import { BaseSystem } from './BaseSystem';

import type { PartStateChangedEvent } from './PartStateSystem';
import type { PivotComponentAccess } from '../types';

/** State for tracking drag interaction per entity */
interface DragState {
  touchInput: TouchInput;
  isDragging: boolean;
}

/** Map of entity UIDs to their drag state */
const partDragStates = new Map<number, DragState>();

/**
 * System that handles touch interaction for loosened and pivoting parts.
 *
 * Attaches/detaches TouchInput based on part state and emits drag events
 * for PivotPhysicsSystem to handle.
 *
 * @example
 * scene.addSystem(PartDragSystem);
 */
export class PartDragSystem extends BaseSystem {
  static readonly NAME = 'partDrag';

  static Queries = {
    parts: {
      components: [PartComponent, PivotComponent, PhysicsBodyComponent],
    },
  };

  private boundHandleStateChanged: (data: PartStateChangedEvent) => void;

  constructor() {
    super();
    this.boundHandleStateChanged = this.handleStateChanged.bind(this);
  }

  /** @example system.init(); */
  init(): void {
    gameEvents.on('part:stateChanged', this.boundHandleStateChanged);
  }

  /** @example system.destroy(); */
  destroy(): void {
    gameEvents.off('part:stateChanged', this.boundHandleStateChanged);

    for (const state of partDragStates.values()) {
      state.touchInput.enabled = false;
    }
    partDragStates.clear();
  }

  /**
   * @param _time - Frame time (unused, event-driven system)
   * @example system.update(time);
   */
  update(_time: Time): void {
    // Event-driven system, no per-frame updates needed
  }

  /**
   * @param data - Part state change event data
   * @example this.handleStateChanged(data);
   */
  private handleStateChanged(data: PartStateChangedEvent): void {
    const { partEntity, newState, previousState } = data;

    const wasInteractive =
      previousState === 'loosened' || previousState === 'pivoting';
    const isInteractive = newState === 'loosened' || newState === 'pivoting';

    if (isInteractive && !wasInteractive) {
      this.attachTouchInput(partEntity as Entity2D);
    }

    if (wasInteractive && !isInteractive) {
      this.detachTouchInput(partEntity);
    }
  }

  /**
   * @param partEntity - The part entity to make interactive
   * @example this.attachTouchInput(partEntity);
   */
  private attachTouchInput(partEntity: Entity2D): void {
    if (partDragStates.has(partEntity.UID)) return;

    const view = partEntity.view;
    this.setupViewForInteraction(view);
    const dragState = this.createDragState(view, partEntity);
    partDragStates.set(partEntity.UID, dragState);
  }

  /**
   * @param view - The container to configure for interaction
   * @example this.setupViewForInteraction(view);
   */
  private setupViewForInteraction(view: Container): void {
    view.eventMode = 'static';
    view.cursor = 'grab';
  }

  /**
   * @param view - The container to attach touch handlers to
   * @param partEntity - The part entity being tracked
   * @returns Drag state with touch input handlers
   * @example this.createDragState(view, partEntity);
   */
  private createDragState(view: Container, partEntity: Entity2D): DragState {
    const touchInput = new TouchInput(view);
    const dragState: DragState = { touchInput, isDragging: false };

    touchInput.onDown = (event: InputEvent): void => {
      this.handleDragStart(dragState, view, partEntity, event);
    };

    touchInput.onMove = (event: InputEvent): void => {
      this.handleDragMove(dragState, partEntity, event);
    };

    touchInput.onUp = (): void => {
      this.handleDragEnd(dragState, view, partEntity);
    };

    touchInput.onOut = (): void => {
      this.handleDragEnd(dragState, view, partEntity);
    };

    return dragState;
  }

  /**
   * @param dragState - Current drag tracking state
   * @param view - The container being dragged
   * @param partEntity - The part entity being dragged
   * @param event - Input event with position data
   * @example this.handleDragStart(state, view, entity, event);
   */
  private handleDragStart(
    dragState: DragState,
    view: Container,
    partEntity: Entity2D,
    event: InputEvent
  ): void {
    dragState.isDragging = true;
    view.cursor = 'grabbing';

    const worldPos = { x: event.position.x, y: event.position.y };
    this.setPivotDragging(partEntity, true);

    gameEvents.emit('part:dragStart', { partEntity, worldPos });
  }

  /**
   * @param dragState - Current drag tracking state
   * @param partEntity - The part entity being dragged
   * @param event - Input event with position data
   * @example this.handleDragMove(state, entity, event);
   */
  private handleDragMove(
    dragState: DragState,
    partEntity: Entity2D,
    event: InputEvent
  ): void {
    if (!dragState.isDragging) return;

    const worldPos = { x: event.position.x, y: event.position.y };
    gameEvents.emit('part:dragMove', { partEntity, worldPos });
  }

  /**
   * @param dragState - Current drag tracking state
   * @param view - The container being dragged
   * @param partEntity - The part entity being dragged
   * @example this.handleDragEnd(state, view, entity);
   */
  private handleDragEnd(
    dragState: DragState,
    view: Container,
    partEntity: Entity2D
  ): void {
    if (!dragState.isDragging) return;

    dragState.isDragging = false;
    view.cursor = 'grab';
    this.setPivotDragging(partEntity, false);

    gameEvents.emit('part:dragEnd', { partEntity });
  }

  /**
   * @param partEntity - The part entity to update
   * @param isDragging - Whether the part is being dragged
   * @example this.setPivotDragging(partEntity, true);
   */
  private setPivotDragging(partEntity: Entity2D, isDragging: boolean): void {
    const c = partEntity.c as unknown as PivotComponentAccess;
    c.pivot.isDragging = isDragging;
  }

  /**
   * @param partEntity - The part entity to remove interaction from
   * @example this.detachTouchInput(partEntity);
   */
  private detachTouchInput(partEntity: Entity): void {
    const dragState = partDragStates.get(partEntity.UID);
    if (!dragState) return;

    dragState.touchInput.enabled = false;
    partDragStates.delete(partEntity.UID);

    const entity2D = partEntity as Entity2D;
    entity2D.view.cursor = 'default';
    entity2D.view.eventMode = 'none';

    const c = partEntity.c as unknown as PivotComponentAccess;
    c.pivot.isDragging = false;
  }
}
