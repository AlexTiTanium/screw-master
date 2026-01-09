import { describe, it, expect, beforeEach } from 'vitest';

import type { Scene2D, Time, QueryResults, Entity } from '@play-co/odie';

import { BaseSystem } from '@scenes/game/systems/BaseSystem';

// Concrete implementation of BaseSystem for testing
class TestSystem extends BaseSystem {
  static readonly NAME = 'test';

  static Queries = {
    testQuery: { components: [] },
  };

  update(_time: Time): void {
    // No-op for testing
  }
}

// Helper to create a mock entity with id property
function createMockEntity(id: string): Entity & { id: string } {
  return {
    id,
    // Add minimal Entity properties needed for tests
  } as unknown as Entity & { id: string };
}

// Helper to create mock query results
function createMockQueryResults(
  queryName: string,
  entities: (Entity & { id: string })[]
): QueryResults {
  return {
    [queryName]: {
      entities,
      first: entities[0],
      forEach: (callback: (entity: Entity & { id: string }) => void) => {
        entities.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('BaseSystem', () => {
  let system: TestSystem;

  beforeEach(() => {
    system = new TestSystem();
    // Cast to allow queries assignment in tests
    (system as { queries: QueryResults }).queries = {} as QueryResults;
  });

  /* eslint-disable @typescript-eslint/dot-notation */
  // Using bracket notation to access protected methods from tests
  describe('forEachEntity', () => {
    it('should iterate over all entities in the query', () => {
      const entity1 = createMockEntity('entity-1');
      const entity2 = createMockEntity('entity-2');
      const entity3 = createMockEntity('entity-3');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity1, entity2, entity3]
      );

      const visited: string[] = [];
      system['forEachEntity']('testQuery', (entity) => {
        visited.push((entity as unknown as { id: string }).id);
      });

      expect(visited).toEqual(['entity-1', 'entity-2', 'entity-3']);
    });

    it('should handle empty query results', () => {
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        []
      );

      let callCount = 0;
      system['forEachEntity']('testQuery', () => {
        callCount++;
      });

      expect(callCount).toBe(0);
    });

    it('should handle non-existent query gracefully', () => {
      (system as { queries: QueryResults }).queries = {} as QueryResults;

      let callCount = 0;
      system['forEachEntity']('nonExistentQuery', () => {
        callCount++;
      });

      expect(callCount).toBe(0);
    });

    it('should handle single entity', () => {
      const entity = createMockEntity('single');
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity]
      );

      let visitedEntity: Entity | undefined;
      system['forEachEntity']('testQuery', (e) => {
        visitedEntity = e;
      });

      expect(visitedEntity).toBe(entity);
    });

    it('should allow mutation of entities during iteration', () => {
      const entity1 = createMockEntity('entity-1');
      const entity2 = createMockEntity('entity-2');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity1, entity2]
      );

      const entities: Entity[] = [];
      system['forEachEntity']('testQuery', (entity) => {
        entities.push(entity);
        // Mutate entity during iteration
        (entity as { modified?: boolean }).modified = true;
      });

      expect(entities).toHaveLength(2);
      expect((entity1 as { modified?: boolean }).modified).toBe(true);
      expect((entity2 as { modified?: boolean }).modified).toBe(true);
    });
  });

  describe('getEntities', () => {
    it('should return all entities in the query', () => {
      const entity1 = createMockEntity('entity-1');
      const entity2 = createMockEntity('entity-2');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity1, entity2]
      );

      const entities = system['getEntities']('testQuery');

      expect(entities).toHaveLength(2);
      expect(entities[0]).toBe(entity1);
      expect(entities[1]).toBe(entity2);
    });

    it('should return empty array for empty query', () => {
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        []
      );

      const entities = system['getEntities']('testQuery');

      expect(entities).toEqual([]);
    });

    it('should return empty array for non-existent query', () => {
      (system as { queries: QueryResults }).queries = {} as QueryResults;

      const entities = system['getEntities']('nonExistentQuery');

      expect(entities).toEqual([]);
    });

    it('should return array reference from query', () => {
      const entityArray = [createMockEntity('entity-1')];
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        entityArray
      );

      const entities = system['getEntities']('testQuery');

      expect(entities).toBe(entityArray);
    });
  });

  describe('getFirstEntity', () => {
    it('should return the first entity in the query', () => {
      const entity1 = createMockEntity('entity-1');
      const entity2 = createMockEntity('entity-2');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity1, entity2]
      );

      const firstEntity = system['getFirstEntity']('testQuery');

      expect(firstEntity).toBe(entity1);
    });

    it('should return undefined for empty query', () => {
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        []
      );

      const firstEntity = system['getFirstEntity']('testQuery');

      expect(firstEntity).toBeUndefined();
    });

    it('should return undefined for non-existent query', () => {
      (system as { queries: QueryResults }).queries = {} as QueryResults;

      const firstEntity = system['getFirstEntity']('nonExistentQuery');

      expect(firstEntity).toBeUndefined();
    });

    it('should return the only entity when query has single entity', () => {
      const entity = createMockEntity('single');
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity]
      );

      const firstEntity = system['getFirstEntity']('testQuery');

      expect(firstEntity).toBe(entity);
    });
  });

  describe('getEntityCount', () => {
    it('should return the count of entities in the query', () => {
      const entity1 = createMockEntity('entity-1');
      const entity2 = createMockEntity('entity-2');
      const entity3 = createMockEntity('entity-3');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity1, entity2, entity3]
      );

      const count = system['getEntityCount']('testQuery');

      expect(count).toBe(3);
    });

    it('should return 0 for empty query', () => {
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        []
      );

      const count = system['getEntityCount']('testQuery');

      expect(count).toBe(0);
    });

    it('should return 0 for non-existent query', () => {
      (system as { queries: QueryResults }).queries = {} as QueryResults;

      const count = system['getEntityCount']('nonExistentQuery');

      expect(count).toBe(0);
    });

    it('should return 1 for single entity query', () => {
      const entity = createMockEntity('single');
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        [entity]
      );

      const count = system['getEntityCount']('testQuery');

      expect(count).toBe(1);
    });

    it('should return accurate count for large queries', () => {
      const entities = Array.from({ length: 100 }, (_, i) =>
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        createMockEntity(`entity-${i}`)
      );
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        'testQuery',
        entities
      );

      const count = system['getEntityCount']('testQuery');

      expect(count).toBe(100);
    });
  });

  describe('multiple queries', () => {
    it('should handle multiple different queries', () => {
      const query1Entities = [createMockEntity('q1-1')];
      const query2Entities = [
        createMockEntity('q2-1'),
        createMockEntity('q2-2'),
      ];

      (system as { queries: QueryResults }).queries = {
        query1: {
          entities: query1Entities,
          first: query1Entities[0],
          forEach: (callback: (entity: Entity) => void) => {
            query1Entities.forEach(callback);
          },
        },
        query2: {
          entities: query2Entities,
          first: query2Entities[0],
          forEach: (callback: (entity: Entity) => void) => {
            query2Entities.forEach(callback);
          },
        },
      } as unknown as QueryResults;

      expect(system['getEntityCount']('query1')).toBe(1);
      expect(system['getEntityCount']('query2')).toBe(2);
      expect(
        (system['getFirstEntity']('query1') as { id: string } | undefined)?.id
      ).toBe('q1-1');
      expect(
        (system['getFirstEntity']('query2') as { id: string } | undefined)?.id
      ).toBe('q2-1');
    });
  });

  describe('update method', () => {
    it('should be defined', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(system.update).toBeDefined();
      expect(typeof system.update).toBe('function');
    });

    it('should accept Time parameter', () => {
      const time = { deltaTime: 16 } as unknown as Time;

      expect(() => {
        system.update(time);
      }).not.toThrow();
    });
  });

  describe('static properties', () => {
    it('should have NAME property', () => {
      expect(TestSystem.NAME).toBe('test');
    });

    it('should have Queries property', () => {
      expect(TestSystem.Queries).toBeDefined();
      expect(TestSystem.Queries).toHaveProperty('testQuery');
    });
  });

  describe('scene property', () => {
    it('should accept scene assignment', () => {
      const mockScene = {} as Scene2D;

      (system as { scene: Scene2D }).scene = mockScene;

      expect(system.scene).toBe(mockScene);
    });
  });
});
