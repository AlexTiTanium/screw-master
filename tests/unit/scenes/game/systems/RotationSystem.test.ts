import { describe, it, expect, beforeEach } from 'vitest';

import type { Entity2D, Time, QueryResults } from '@play-co/odie';
import { Container } from 'pixi.js';

import { RotationComponent } from '@scenes/game/components/RotationComponent';
import { RotationSystem } from '@scenes/game/systems/RotationSystem';

// Helper to create a mock Entity2D with RotationComponent
function createMockRotatingEntity(
  id: string,
  speed: number,
  initialRotation = 0
): Entity2D {
  const view = new Container();
  view.rotation = initialRotation;

  const rotationComponent = new RotationComponent();
  rotationComponent.init!({ speed });

  return {
    id,
    view,
    c: {
      rotation: rotationComponent,
    },
  } as unknown as Entity2D;
}

// Helper to create mock query results
function createMockQueryResults(entities: Entity2D[]): QueryResults {
  return {
    rotating: {
      entities,
      first: entities[0],
      forEach: (callback: (entity: Entity2D) => void) => {
        entities.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('RotationSystem', () => {
  let system: RotationSystem;

  beforeEach(() => {
    system = new RotationSystem();
  });

  describe('static properties', () => {
    it('should have correct NAME', () => {
      expect(RotationSystem.NAME).toBe('rotation');
    });

    it('should define rotating query with RotationComponent', () => {
      expect(RotationSystem.Queries).toBeDefined();
      expect(RotationSystem.Queries.rotating).toBeDefined();
      expect(RotationSystem.Queries.rotating.components).toContain(
        RotationComponent
      );
    });
  });

  describe('update', () => {
    it('should rotate entity based on speed and deltaTime', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      // Rotation should be speed * deltaTime = PI * 1 = PI
      expect(entity.view.rotation).toBe(Math.PI);
    });

    it('should accumulate rotation over multiple frames', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI / 2, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;

      // Frame 1
      system.update(time);
      expect(entity.view.rotation).toBeCloseTo(Math.PI / 2);

      // Frame 2
      system.update(time);
      expect(entity.view.rotation).toBeCloseTo(Math.PI);

      // Frame 3
      system.update(time);
      expect(entity.view.rotation).toBeCloseTo((Math.PI * 3) / 2);
    });

    it('should handle fractional deltaTime correctly', () => {
      const entity = createMockRotatingEntity('entity-1', 1, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      // Simulate 16ms frame (0.016 seconds)
      const time = { deltaTime: 0.016 } as unknown as Time;
      system.update(time);

      expect(entity.view.rotation).toBeCloseTo(0.016);
    });

    it('should handle zero deltaTime', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 0 } as unknown as Time;
      system.update(time);

      expect(entity.view.rotation).toBe(0);
    });

    it('should handle zero speed', () => {
      const entity = createMockRotatingEntity('entity-1', 0, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      expect(entity.view.rotation).toBe(0);
    });

    it('should handle negative speed (counter-clockwise rotation)', () => {
      const entity = createMockRotatingEntity('entity-1', -Math.PI, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      expect(entity.view.rotation).toBe(-Math.PI);
    });

    it('should preserve initial rotation', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI, Math.PI / 4);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      // Initial PI/4 + speed PI * deltaTime 1 = PI/4 + PI = 5PI/4
      expect(entity.view.rotation).toBeCloseTo((5 * Math.PI) / 4);
    });

    it('should handle multiple entities', () => {
      const entity1 = createMockRotatingEntity('entity-1', Math.PI, 0);
      const entity2 = createMockRotatingEntity('entity-2', Math.PI / 2, 0);
      const entity3 = createMockRotatingEntity('entity-3', -Math.PI, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity1,
        entity2,
        entity3,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      expect(entity1.view.rotation).toBeCloseTo(Math.PI);
      expect(entity2.view.rotation).toBeCloseTo(Math.PI / 2);
      expect(entity3.view.rotation).toBeCloseTo(-Math.PI);
    });

    it('should handle empty query', () => {
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        []
      );

      const time = { deltaTime: 1 } as unknown as Time;

      expect(() => {
        system.update(time);
      }).not.toThrow();
    });

    it('should handle very small speed values', () => {
      const entity = createMockRotatingEntity('entity-1', 0.0001, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      expect(entity.view.rotation).toBeCloseTo(0.0001);
    });

    it('should handle very large speed values', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI * 100, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      expect(entity.view.rotation).toBeCloseTo(Math.PI * 100);
    });

    it('should handle rotation wrapping beyond 2PI', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI * 2, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 2 } as unknown as Time;
      system.update(time);

      // Rotation is 4PI (2 full rotations)
      // PixiJS doesn't automatically wrap, so it should be exactly 4PI
      expect(entity.view.rotation).toBeCloseTo(Math.PI * 4);
    });

    it('should maintain independent rotation for each entity', () => {
      const entity1 = createMockRotatingEntity('entity-1', 1, 0);
      const entity2 = createMockRotatingEntity('entity-2', 2, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity1,
        entity2,
      ]);

      // First frame
      const time1 = { deltaTime: 1 } as unknown as Time;
      system.update(time1);

      expect(entity1.view.rotation).toBeCloseTo(1);
      expect(entity2.view.rotation).toBeCloseTo(2);

      // Second frame
      const time2 = { deltaTime: 0.5 } as unknown as Time;
      system.update(time2);

      expect(entity1.view.rotation).toBeCloseTo(1.5);
      expect(entity2.view.rotation).toBeCloseTo(3);
    });

    it('should handle entity with missing rotation component gracefully', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI, 0);
      // Remove the rotation component
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      entity.c.rotation =
        undefined as unknown as typeof RotationComponent.prototype;

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;

      expect(() => {
        system.update(time);
      }).not.toThrow();

      // Rotation should not change
      expect(entity.view.rotation).toBe(0);
    });

    it('should update view.rotation, not entity.rotation', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI, Math.PI / 4);
      const originalViewRotation = entity.view.rotation;

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      const time = { deltaTime: 1 } as unknown as Time;
      system.update(time);

      // view.rotation should change
      expect(entity.view.rotation).not.toBe(originalViewRotation);
      expect(entity.view.rotation).toBeCloseTo((5 * Math.PI) / 4);
    });
  });

  describe('realistic game scenarios', () => {
    it('should rotate at 90 degrees per second', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI / 2, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      // Simulate 60 FPS (16.67ms per frame)
      const frameTime = 1 / 60;

      // 60 frames = 1 second
      for (let i = 0; i < 60; i++) {
        system.update({ deltaTime: frameTime } as unknown as Time);
      }

      // Should be approximately 90 degrees (PI/2 radians)
      expect(entity.view.rotation).toBeCloseTo(Math.PI / 2, 2);
    });

    it('should rotate at 360 degrees per second', () => {
      const entity = createMockRotatingEntity('entity-1', Math.PI * 2, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      // Simulate 60 FPS for 1 second
      const frameTime = 1 / 60;

      for (let i = 0; i < 60; i++) {
        system.update({ deltaTime: frameTime } as unknown as Time);
      }

      // Should complete one full rotation (2PI radians)
      expect(entity.view.rotation).toBeCloseTo(Math.PI * 2, 1);
    });

    it('should handle variable frame rates', () => {
      const entity = createMockRotatingEntity('entity-1', 1, 0);
      (system as { queries: QueryResults }).queries = createMockQueryResults([
        entity,
      ]);

      // Mix of different frame times
      system.update({ deltaTime: 0.016 } as unknown as Time); // ~60 FPS
      system.update({ deltaTime: 0.033 } as unknown as Time); // ~30 FPS
      system.update({ deltaTime: 0.008 } as unknown as Time); // ~120 FPS

      const totalRotation = 0.016 + 0.033 + 0.008;
      expect(entity.view.rotation).toBeCloseTo(totalRotation);
    });
  });
});
