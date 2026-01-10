/**
 * Type interfaces for accessing ODIE component data.
 *
 * ODIE's Entity.c is loosely typed, so we use these interfaces
 * with type assertions to get proper typing for component access.
 *
 * @example
 * const screw = (entity.c as unknown as ScrewComponentAccess).screw;
 */

import type { ScrewColor } from '@shared/types';
import type { ScrewState, GamePhase } from '../components';

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
