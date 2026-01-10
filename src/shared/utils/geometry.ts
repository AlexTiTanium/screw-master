/**
 * Geometry utilities for bounds checking.
 *
 * Used primarily for validating screw positions within part collision shapes.
 *
 * @module
 */

import type {
  Position,
  CollisionShape,
  BoxCollisionShape,
} from '@shared/types';

/** Screw head radius in pixels for bounds checking */
export const SCREW_RADIUS = 40;

/**
 * Check if a point is inside a box collision shape.
 *
 * @param point - Point to check
 * @param box - Box collision shape
 * @returns True if point is inside or on boundary
 * @example
 * const inside = isPointInBox({ x: 50, y: 50 }, { type: 'box', width: 100, height: 100 });
 */
export function isPointInBox(point: Position, box: BoxCollisionShape): boolean {
  return (
    point.x >= 0 &&
    point.x <= box.width &&
    point.y >= 0 &&
    point.y <= box.height
  );
}

/**
 * Check if a circle is fully inside a box collision shape.
 *
 * @param center - Circle center point
 * @param radius - Circle radius
 * @param box - Box collision shape
 * @returns True if circle is fully contained
 * @example
 * const inside = isCircleInBox({ x: 50, y: 50 }, 10, { type: 'box', width: 100, height: 100 });
 */
export function isCircleInBox(
  center: Position,
  radius: number,
  box: BoxCollisionShape
): boolean {
  return (
    center.x - radius >= 0 &&
    center.x + radius <= box.width &&
    center.y - radius >= 0 &&
    center.y + radius <= box.height
  );
}

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 *
 * @param point - Point to check
 * @param polygon - Array of polygon vertices
 * @returns True if point is inside polygon
 * @example
 * const inside = isPointInPolygon({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
 */
export function isPointInPolygon(
  point: Position,
  polygon: Position[]
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];

    if (pi === undefined || pj === undefined) continue;

    if (
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a circle is approximately inside a polygon.
 *
 * Uses 5-point approximation: center + 4 cardinal direction points.
 *
 * @param center - Circle center point
 * @param radius - Circle radius
 * @param polygon - Array of polygon vertices
 * @returns True if all test points are inside polygon
 * @example
 * const inside = isCircleInPolygon({ x: 50, y: 50 }, 10, polygon);
 */
export function isCircleInPolygon(
  center: Position,
  radius: number,
  polygon: Position[]
): boolean {
  const testPoints: Position[] = [
    center,
    { x: center.x - radius, y: center.y },
    { x: center.x + radius, y: center.y },
    { x: center.x, y: center.y - radius },
    { x: center.x, y: center.y + radius },
  ];

  return testPoints.every((point) => isPointInPolygon(point, polygon));
}

/**
 * Check if a screw at given position is within collision bounds.
 *
 * @param screwPosition - Screw center position (local to part)
 * @param collision - Part collision shape
 * @param radius - Screw radius (defaults to SCREW_RADIUS)
 * @returns True if screw is fully within bounds
 * @example
 * const valid = isScrewInBounds({ x: 100, y: 100 }, collision);
 */
export function isScrewInBounds(
  screwPosition: Position,
  collision: CollisionShape,
  radius: number = SCREW_RADIUS
): boolean {
  if (collision.type === 'box') {
    return isCircleInBox(screwPosition, radius, collision);
  } else {
    return isCircleInPolygon(screwPosition, radius, collision.points);
  }
}
