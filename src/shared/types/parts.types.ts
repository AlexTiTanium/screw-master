/**
 * Type definitions for puzzle parts.
 *
 * Parts are defined in TypeScript code (not JSON) because they contain
 * constant properties like shapes, physics constraints, and materials.
 *
 * @module
 */

import type { Position } from './game.types';

/**
 * Available screw colors.
 *
 * String enum for JSON readability and debuggability.
 */
export enum ScrewColor {
  Red = 'red',
  Blue = 'blue',
  Green = 'green',
  Yellow = 'yellow',
}

/**
 * Static constraint - part cannot move.
 */
export interface StaticConstraintDef {
  type: 'static';
}

/**
 * Slider constraint - linear motion along an axis.
 */
export interface SliderConstraintDef {
  type: 'slider';
  /** Movement axis relative to part */
  axis: 'x' | 'y';
  /** Minimum travel distance in pixels */
  min: number;
  /** Maximum travel distance in pixels */
  max: number;
}

/**
 * Hinge constraint - rotation around a pivot point.
 */
export interface HingeConstraintDef {
  type: 'hinge';
  /** Pivot point relative to part origin */
  pivot: Position;
  /** Minimum angle in degrees */
  minAngle: number;
  /** Maximum angle in degrees */
  maxAngle: number;
}

/**
 * Spring constraint - tension release behavior.
 */
export interface SpringConstraintDef {
  type: 'spring';
  /** Direction spring pulls toward when released */
  direction: 'open' | 'closed';
  /** Animation duration in milliseconds */
  duration: number;
}

/**
 * Friction constraint - resistance until screw threshold is met.
 */
export interface FrictionConstraintDef {
  type: 'friction';
  /** Number of screws that must be removed before part can move */
  screwThreshold: number;
}

/**
 * Union of all constraint types.
 */
export type ConstraintDef =
  | StaticConstraintDef
  | SliderConstraintDef
  | HingeConstraintDef
  | SpringConstraintDef
  | FrictionConstraintDef;

/**
 * Box collision shape.
 */
export interface BoxCollisionShape {
  type: 'box';
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Polygon collision shape.
 */
export interface PolygonCollisionShape {
  type: 'polygon';
  /** Vertices relative to part origin */
  points: Position[];
}

/**
 * Union of all collision shapes.
 */
export type CollisionShape = BoxCollisionShape | PolygonCollisionShape;

/**
 * Visual material types.
 */
export type MaterialType = 'metal' | 'wood' | 'plastic' | 'rubber' | 'glass';

/**
 * Screw mount point on a part.
 *
 * Defines where a screw CAN be attached. The level JSON specifies
 * which mounts are actually used and what color each screw is.
 */
export interface ScrewMountDef {
  /** Unique identifier within the part (e.g., 'top-left', 'center') */
  id: string;
  /** Position relative to part origin */
  localPosition: Position;
}

/**
 * Part definition - the "blueprint" for a puzzle part.
 *
 * Defined in TypeScript code, not JSON. Contains all properties
 * that are constant for every instance of this part type.
 */
export interface PartDefinition {
  /** Unique identifier (e.g., 'simple-plate', 'sliding-cover') */
  id: string;
  /** Display name for debugging/tools */
  name: string;
  /** Asset path for sprite, or null for procedural geometry */
  asset: string | null;
  /** Collision shape for physics */
  collision: CollisionShape;
  /** Visual material type */
  material: MaterialType;
  /** Physics constraint behavior */
  constraint: ConstraintDef;
  /** Available screw mount points */
  screwMounts: ScrewMountDef[];
  /** Custom pivot point (defaults to center of collision bounds) */
  pivot?: Position;
}
