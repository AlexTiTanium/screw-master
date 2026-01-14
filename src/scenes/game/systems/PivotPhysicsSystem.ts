/**
 * PivotPhysicsSystem - Manages physics joints for pivot behavior.
 *
 * This system:
 * - Listens for part:stateChanged events
 * - Creates RevoluteJoint when part transitions to 'pivoting' state
 * - Manages MouseJoint for drag interaction
 * - Destroys joints when part transitions to 'free' or is removed
 *
 * Joint configuration:
 * - RevoluteJoint: Created at the remaining screw position with ±45° angle limit
 * - MouseJoint: Created when user starts dragging, destroyed on release
 *
 * @example
 * // System registration (after PartStateSystem, before PhysicsSystem)
 * scene.addSystem(PivotPhysicsSystem);
 *
 * // Listen for drag events from PartDragSystem
 * gameEvents.on('part:dragStart', (event) => { ... });
 */

import type { Time, Entity, Entity2D } from '@play-co/odie';

import { PhysicsWorldManager } from '@physics';

import {
  PartComponent,
  PivotComponent,
  PhysicsBodyComponent,
} from '../components';
import { gameEvents } from '../utils';

import { BaseSystem } from './BaseSystem';

import type { PartStateChangedEvent } from './PartStateSystem';
import type {
  PartComponentAccess,
  PivotComponentAccess,
  PhysicsBodyComponentAccess,
} from '../types';

/** Event data for part drag start */
export interface PartDragStartEvent {
  partEntity: Entity;
  worldPos: { x: number; y: number };
}

/** Event data for part drag move */
export interface PartDragMoveEvent {
  partEntity: Entity;
  worldPos: { x: number; y: number };
}

/** Event data for part drag end */
export interface PartDragEndEvent {
  partEntity: Entity;
}

/** State tracking for pivot joints (pivoting state) */
interface PivotJointState {
  anchorBodyId: number;
  revoluteJointId: number;
  mouseJointId?: number;
}

/** State tracking for loosened parts (wobble only) */
interface LoosenedState {
  mouseJointId?: number;
  anchorBodyId: number;
}

/**
 * System that manages physics joints for pivot behavior.
 *
 * Creates revolute joints when parts have 1 screw remaining,
 * allowing them to swing like pendulums around the screw position.
 *
 * @example
 * scene.addSystem(PivotPhysicsSystem);
 */
export class PivotPhysicsSystem extends BaseSystem {
  static readonly NAME = 'pivotPhysics';

  static Queries = {
    parts: {
      components: [PartComponent, PivotComponent, PhysicsBodyComponent],
    },
  };

  private physicsManager: PhysicsWorldManager;

  /** Active joints for each pivoting part (keyed by entity UID). */
  private pivotJoints = new Map<number, PivotJointState>();

  /** Active state for loosened parts (keyed by entity UID). */
  private loosenedStates = new Map<number, LoosenedState>();

  private boundHandleStateChanged: (data: PartStateChangedEvent) => void;
  private boundHandleDragStart: (data: PartDragStartEvent) => void;
  private boundHandleDragMove: (data: PartDragMoveEvent) => void;
  private boundHandleDragEnd: (data: PartDragEndEvent) => void;

  constructor() {
    super();
    this.physicsManager = PhysicsWorldManager.getInstance();
    this.boundHandleStateChanged = this.handleStateChanged.bind(this);
    this.boundHandleDragStart = this.handleDragStart.bind(this);
    this.boundHandleDragMove = this.handleDragMove.bind(this);
    this.boundHandleDragEnd = this.handleDragEnd.bind(this);
  }

  /** @example system.init(); */
  init(): void {
    gameEvents.on<PartStateChangedEvent>(
      'part:stateChanged',
      this.boundHandleStateChanged
    );
    gameEvents.on<PartDragStartEvent>(
      'part:dragStart',
      this.boundHandleDragStart
    );
    gameEvents.on<PartDragMoveEvent>('part:dragMove', this.boundHandleDragMove);
    gameEvents.on<PartDragEndEvent>('part:dragEnd', this.boundHandleDragEnd);
  }

  /** @example system.destroy(); */
  destroy(): void {
    gameEvents.off('part:stateChanged', this.boundHandleStateChanged);
    gameEvents.off('part:dragStart', this.boundHandleDragStart);
    gameEvents.off('part:dragMove', this.boundHandleDragMove);
    gameEvents.off('part:dragEnd', this.boundHandleDragEnd);

    // Clean up all joints
    for (const [, jointState] of this.pivotJoints) {
      this.cleanupJointState(jointState);
    }
    this.pivotJoints.clear();

    // Clean up loosened states
    for (const [, state] of this.loosenedStates) {
      this.cleanupLoosenedState(state);
    }
    this.loosenedStates.clear();
  }

  /**
   * @param data - Part state change event data
   * @example this.handleStateChanged(data);
   */
  private handleStateChanged(data: PartStateChangedEvent): void {
    const { partEntity, newState, previousState } = data;
    const entityUid = partEntity.UID;

    // Clean up existing joints when leaving pivoting state
    if (previousState === 'pivoting' && newState !== 'pivoting') {
      const jointState = this.pivotJoints.get(entityUid);
      if (jointState) {
        this.cleanupJointState(jointState);
        this.pivotJoints.delete(entityUid);
      }
    }

    // Clean up loosened state when leaving
    if (previousState === 'loosened' && newState !== 'loosened') {
      const loosenedState = this.loosenedStates.get(entityUid);
      if (loosenedState) {
        this.cleanupLoosenedState(loosenedState);
        this.loosenedStates.delete(entityUid);
      }
    }

    // Create new joints when entering pivoting state
    if (newState === 'pivoting') {
      this.createPivotJoints(partEntity);
    }

    // Set up loosened state for wobble interaction
    if (newState === 'loosened') {
      this.createLoosenedState(partEntity);
    }
  }

  /**
   * @param partEntity - The part entity to set up loosened state for
   * @example this.createLoosenedState(partEntity);
   */
  private createLoosenedState(partEntity: Entity): void {
    const entity2d = partEntity as Entity2D;
    const physicsBody =
      this.getComponents<PhysicsBodyComponentAccess>(partEntity).physicsBody;

    if (physicsBody.bodyId < 0) return;

    // For loosened state, we create an anchor body at the part center
    // with a very limited angle revolute joint (±5° = ~0.087 rad)
    const partPosition = { x: entity2d.position.x, y: entity2d.position.y };
    const anchorBodyId = this.physicsManager.createAnchorBody(partPosition);

    // Create revolute joint with small angle limit for wobble
    const wobbleAngleLimit = Math.PI / 36; // ±5 degrees
    const revoluteJointId = this.physicsManager.createRevoluteJoint(
      anchorBodyId,
      physicsBody.bodyId,
      partPosition,
      wobbleAngleLimit
    );

    if (revoluteJointId < 0) {
      this.physicsManager.destroyAnchorBody(anchorBodyId);
      return;
    }

    // Update component to reflect dynamic state (createRevoluteJoint sets body to dynamic)
    physicsBody.bodyType = 'dynamic';
    physicsBody.isSleeping = false;

    this.loosenedStates.set(entity2d.UID, {
      anchorBodyId,
    });

    // Store the joint in pivotJoints map since it uses the same cleanup logic
    this.pivotJoints.set(entity2d.UID, {
      anchorBodyId,
      revoluteJointId,
    });
  }

  /**
   * @param state - Loosened state to clean up
   * @example this.cleanupLoosenedState(state);
   */
  private cleanupLoosenedState(state: LoosenedState): void {
    if (state.mouseJointId !== undefined) {
      this.physicsManager.destroyJoint(state.mouseJointId);
    }
    // Note: anchorBodyId and revolute joint are in pivotJoints and cleaned up there
  }

  /**
   * @param partEntity - The part entity to create pivot joints for
   * @example this.createPivotJoints(partEntity);
   */
  private createPivotJoints(partEntity: Entity): void {
    const entity2d = partEntity as Entity2D;
    const pivot = this.getComponents<PivotComponentAccess>(partEntity).pivot;
    const physicsBody =
      this.getComponents<PhysicsBodyComponentAccess>(partEntity).physicsBody;

    if (physicsBody.bodyId < 0) return;

    // Create static anchor body at the pivot point (screw position)
    const anchorBodyId = this.physicsManager.createAnchorBody(pivot.pivotPoint);

    // Create revolute joint connecting anchor to part
    const revoluteJointId = this.physicsManager.createRevoluteJoint(
      anchorBodyId,
      physicsBody.bodyId,
      pivot.pivotPoint,
      pivot.angleLimit
    );

    if (revoluteJointId < 0) {
      // Clean up anchor if joint creation failed
      this.physicsManager.destroyAnchorBody(anchorBodyId);
      return;
    }

    // Update component to reflect dynamic state (createRevoluteJoint sets body to dynamic)
    physicsBody.bodyType = 'dynamic';
    physicsBody.isSleeping = false;

    // Store joint state for cleanup later
    this.pivotJoints.set(entity2d.UID, {
      anchorBodyId,
      revoluteJointId,
    });
  }

  /**
   * @param data - Drag start event data with position
   * @example this.handleDragStart(data);
   */
  private handleDragStart(data: PartDragStartEvent): void {
    const { partEntity, worldPos } = data;
    const jointState = this.pivotJoints.get(partEntity.UID);
    const loosenedState = this.loosenedStates.get(partEntity.UID);

    if (!jointState && !loosenedState) return; // Not an interactive part

    const physicsBody =
      this.getComponents<PhysicsBodyComponentAccess>(partEntity).physicsBody;

    if (physicsBody.bodyId < 0) return;

    // Create mouse joint for dragging
    const mouseJointId = this.physicsManager.createMouseJoint(
      physicsBody.bodyId,
      worldPos
    );

    if (mouseJointId >= 0) {
      if (jointState) {
        jointState.mouseJointId = mouseJointId;
      }
      if (loosenedState) {
        loosenedState.mouseJointId = mouseJointId;
      }
    }
  }

  /**
   * @param data - Drag move event data with position
   * @example this.handleDragMove(data);
   */
  private handleDragMove(data: PartDragMoveEvent): void {
    const { partEntity, worldPos } = data;
    const jointState = this.pivotJoints.get(partEntity.UID);
    const loosenedState = this.loosenedStates.get(partEntity.UID);

    const mouseJointId =
      jointState?.mouseJointId ?? loosenedState?.mouseJointId;

    if (mouseJointId === undefined) return;

    this.physicsManager.updateMouseJointTarget(mouseJointId, worldPos);
  }

  /**
   * @param data - Drag end event data
   * @example this.handleDragEnd(data);
   */
  private handleDragEnd(data: PartDragEndEvent): void {
    const { partEntity } = data;
    const jointState = this.pivotJoints.get(partEntity.UID);
    const loosenedState = this.loosenedStates.get(partEntity.UID);

    if (jointState?.mouseJointId !== undefined) {
      this.physicsManager.destroyJoint(jointState.mouseJointId);
      delete jointState.mouseJointId;
    }

    if (loosenedState?.mouseJointId !== undefined) {
      this.physicsManager.destroyJoint(loosenedState.mouseJointId);
      delete loosenedState.mouseJointId;
    }
  }

  /**
   * @param jointState - Joint state to clean up
   * @example this.cleanupJointState(jointState);
   */
  private cleanupJointState(jointState: PivotJointState): void {
    // Destroy mouse joint if active
    if (jointState.mouseJointId !== undefined) {
      this.physicsManager.destroyJoint(jointState.mouseJointId);
    }

    // Destroy revolute joint
    this.physicsManager.destroyJoint(jointState.revoluteJointId);

    // Destroy anchor body
    this.physicsManager.destroyAnchorBody(jointState.anchorBodyId);
  }

  /**
   * @param _time - Frame time (unused, position sync only)
   * @example system.update(time);
   */
  update(_time: Time): void {
    // Sync positions for pivoting and loosened parts
    // Note: PhysicsSystem normally syncs positions, but we skip these parts there
    // because the revolute joint controls their position/rotation
    this.forEachEntity('parts', (entity) => {
      const part = this.getComponents<PartComponentAccess>(entity).part;

      if (part.state !== 'pivoting' && part.state !== 'loosened') return;

      const physicsBody =
        this.getComponents<PhysicsBodyComponentAccess>(entity).physicsBody;
      if (physicsBody.bodyId < 0) return;

      const entity2d = entity as Entity2D;

      // Get interpolated position and rotation from physics
      const alpha = this.physicsManager.captureAlphaForDebug();
      const position = this.physicsManager.getBodyPositionInterpolated(
        physicsBody.bodyId,
        alpha
      );
      const rotation = this.physicsManager.getBodyRotationInterpolated(
        physicsBody.bodyId,
        alpha
      );

      if (position) {
        entity2d.position.x = position.x;
        entity2d.position.y = position.y;
      }
      entity2d.view.rotation = rotation;
    });
  }
}
