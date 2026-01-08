export type { GameState, Position, Size } from './game.types';

// Part types
export {
  ScrewColor,
  type StaticConstraintDef,
  type SliderConstraintDef,
  type HingeConstraintDef,
  type SpringConstraintDef,
  type FrictionConstraintDef,
  type ConstraintDef,
  type BoxCollisionShape,
  type PolygonCollisionShape,
  type CollisionShape,
  type MaterialType,
  type ScrewMountDef,
  type PartDefinition,
} from './parts.types';

// Level types
export type {
  ScrewPlacement,
  PartInstance,
  TrayConfig,
  AllScrewsRemovedWin,
  PartsRemovedWin,
  TargetFreedWin,
  WinCondition,
  LevelDefinition,
  RegionDefinition,
} from './level.types';
