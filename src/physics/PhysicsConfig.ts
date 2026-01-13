/**
 * Physics configuration constants.
 *
 * All measurements are in pixels unless otherwise noted.
 * Planck.js uses meters internally, so we scale by PHYSICS_CONFIG.scale.
 */

export const PHYSICS_CONFIG = {
  /** Pixels per meter - used for Planck.js coordinate conversion */
  scale: 100,

  /** Gravity in pixels per second squared (~20 m/s², 2x normal) */
  gravity: 1960,

  /** Fixed timestep in milliseconds (60 Hz) */
  fixedTimestep: 1000 / 60,

  /** Velocity constraint solver iterations */
  velocityIterations: 8,

  /** Position constraint solver iterations */
  positionIterations: 3,

  /** Default density for part bodies (kg/m²) */
  partDensity: 1.0,

  /** Default friction coefficient */
  friction: 0.3,

  /** Default restitution (bounciness) - low for minimal bounce */
  restitution: 0.1,

  /** Linear damping to slow falling parts (low for faster falling) */
  linearDamping: 0.05,

  /** Angular damping to reduce rotation */
  angularDamping: 0.3,

  /** Play area bounds in pixels */
  playArea: {
    minX: 132,
    maxX: 947,
    minY: 600,
    maxY: 1750,
    width: 815,
    height: 1150,
    centerX: 540,
    centerY: 1175,
  },

  /** Boundary wall thickness in pixels */
  boundaryThickness: 50,
} as const;

export type PhysicsConfig = typeof PHYSICS_CONFIG;
