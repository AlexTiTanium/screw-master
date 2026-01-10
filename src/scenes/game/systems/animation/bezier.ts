import type { FlightParams } from './types';
import { POP_OUT_HEIGHT, POP_OUT_SCALE } from './types';

/**
 * Calculate quadratic bezier position at parameter t.
 * @param t - Parameter from 0 to 1
 * @param p0 - Start point
 * @param p1 - Control point
 * @param p2 - End point
 * @returns Position at parameter t
 * @example
 * const x = bezierPosition(0.5, 0, 100, 200); // Returns 100
 */
export function bezierPosition(
  t: number,
  p0: number,
  p1: number,
  p2: number
): number {
  const invT = 1 - t;
  return invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;
}

/**
 * Create flight parameters for bezier animation.
 * @param start - Start position with x and y coordinates
 * @param start.x - Start X coordinate
 * @param start.y - Start Y coordinate
 * @param end - End position with x and y coordinates
 * @param end.x - End X coordinate
 * @param end.y - End Y coordinate
 * @param endScale - Target scale
 * @param arcHeight - Arc height offset
 * @returns Flight parameters
 * @example
 * const params = createFlightParams({ x: 0, y: 0 }, { x: 100, y: 100 }, 0.5, 130);
 */
export function createFlightParams(
  start: { x: number; y: number },
  end: { x: number; y: number },
  endScale: number,
  arcHeight: number
): FlightParams {
  const flightStartY = start.y - POP_OUT_HEIGHT;
  return {
    startX: start.x,
    startY: flightStartY,
    controlX: (start.x + end.x) / 2,
    controlY: Math.min(flightStartY, end.y) - arcHeight,
    endX: end.x,
    endY: end.y,
    startScale: POP_OUT_SCALE,
    endScale,
  };
}
