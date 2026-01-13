/**
 * Type interfaces for accessing ODIE component data.
 *
 * ODIE's Entity.c is loosely typed, so we use these interfaces
 * with the BaseSystem.getComponents helper to get proper typing.
 *
 * @example
 * // In a system that extends BaseSystem:
 * const screw = this.getComponents<ScrewComponentAccess>(entity).screw;
 */

import type { Entity } from '@play-co/odie';
import type { ScrewColor } from '@shared/types';
import type { BodyType } from '@physics';
import type { ScrewState, GamePhase, PartState } from '../components';

/**
 * Get typed component access from an entity.
 *
 * This is a standalone helper for use outside of BaseSystem (e.g., in tests).
 * Systems should use the protected BaseSystem.getComponents method instead.
 *
 * @param entity - The entity to get components from
 * @returns The entity's component map cast to the specified type
 * @example
 * const screw = getComponents<ScrewComponentAccess>(entity).screw;
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is intentionally only in return type for type casting
export function getComponents<T>(entity: Entity): T {
  return entity.c as unknown as T;
}

export interface ScrewComponentAccess {
  screw: {
    color: ScrewColor;
    partEntityId: string;
    state: ScrewState;
    trayEntityId: string;
    slotIndex: number;
    isAnimating: boolean;
  };
}

export interface TrayComponentAccess {
  tray: {
    color: ScrewColor;
    capacity: number;
    screwCount: number;
    displayOrder: number;
    isAnimating: boolean;
  };
}

export interface BufferTrayComponentAccess {
  bufferTray: {
    capacity: number;
    screwIds: string[];
  };
}

export interface GameStateComponentAccess {
  gameState: {
    phase: GamePhase;
    totalScrews: number;
    removedScrews: number;
    winConditionType: string;
  };
}

export interface PartComponentAccess {
  part: {
    partDefinitionId: string;
    layer: number;
    screwCount: number;
    state: PartState;
  };
}

export interface PhysicsBodyComponentAccess {
  physicsBody: {
    bodyId: number;
    bodyType: BodyType;
    isSleeping: boolean;
    enabled: boolean;
  };
}
