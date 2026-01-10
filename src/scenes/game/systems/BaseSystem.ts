import type {
  System,
  Entity,
  Scene2D,
  Time,
  QueryResults,
} from '@play-co/odie';

/**
 * Abstract base class for ODIE systems with convenience methods.
 *
 * This class provides a foundation for building game systems with:
 * - Typed access to scene and query results
 * - Helper method for iterating over entities in a query
 * - Proper TypeScript typing for Entity2D-based entities
 *
 * Systems are the "S" in ECS (Entity-Component-System). They contain the game
 * logic that operates on entities with specific components.
 *
 * @example
 * // Create a movement system
 * import { BaseSystem } from './BaseSystem';
 * import { VelocityComponent } from '../components';
 *
 * export class MovementSystem extends BaseSystem {
 *   static readonly NAME = 'movement';
 *   static Queries = {
 *     movable: { components: [VelocityComponent] }
 *   };
 *
 *   update(time: Time): void {
 *     this.forEachEntity('movable', (entity) => {
 *       const velocity = entity.c.velocity;
 *       entity.position.x += velocity.x * time.deltaTime;
 *       entity.position.y += velocity.y * time.deltaTime;
 *     });
 *   }
 * }
 *
 * @example
 * // Register the system with a scene
 * import { MovementSystem } from './systems/MovementSystem';
 *
 * // In your scene setup:
 * scene.addSystem(MovementSystem);
 *
 * @example
 * // Create a collision system with multiple queries
 * export class CollisionSystem extends BaseSystem {
 *   static readonly NAME = 'collision';
 *   static Queries = {
 *     players: { components: [PlayerComponent, ColliderComponent] },
 *     enemies: { components: [EnemyComponent, ColliderComponent] }
 *   };
 *
 *   update(_time: Time): void {
 *     this.forEachEntity('players', (player) => {
 *       this.forEachEntity('enemies', (enemy) => {
 *         if (this.checkCollision(player, enemy)) {
 *           // Handle collision
 *         }
 *       });
 *     });
 *   }
 *
 *   private checkCollision(a: Entity, b: Entity): boolean {
 *     // Collision detection logic
 *     return false;
 *   }
 * }
 */
export abstract class BaseSystem implements System<unknown, Scene2D> {
  /**
   * Reference to the scene this system is attached to.
   * Automatically injected by ODIE when the system is added to a scene.
   * @readonly
   */
  declare readonly scene: Scene2D;

  /**
   * Query results containing entities that match each defined query.
   * Automatically populated by ODIE based on the static Queries definition.
   * @readonly
   */
  declare readonly queries: QueryResults;

  /**
   * Iterates over all entities matching a named query.
   *
   * This is a convenience method that safely handles cases where the query
   * might not exist or be empty.
   *
   * @param queryName - The name of the query (as defined in static Queries)
   * @param callback - Function to call for each entity
   *
   * @example
   * this.forEachEntity('movable', (entity) => {
   *   entity.position.x += 1;
   * });
   */
  protected forEachEntity(
    queryName: string,
    callback: (entity: Entity) => void
  ): void {
    const query = this.queries[queryName];
    if (query) {
      query.forEach(callback);
    }
  }

  /**
   * Gets all entities matching a named query.
   *
   * @param queryName - The name of the query (as defined in static Queries)
   * @returns Array of entities, or empty array if query doesn't exist
   *
   * @example
   * const enemies = this.getEntities('enemies');
   * console.log(`${enemies.length} enemies in scene`);
   */
  protected getEntities(queryName: string): Entity[] {
    const query = this.queries[queryName];
    return query?.entities ?? [];
  }

  /**
   * Gets the first entity matching a named query.
   *
   * Useful for singleton entities like player or camera.
   *
   * @param queryName - The name of the query (as defined in static Queries)
   * @returns The first entity or undefined if query is empty
   *
   * @example
   * const player = this.getFirstEntity('players');
   * if (player) {
   *   // Update player
   * }
   */
  protected getFirstEntity(queryName: string): Entity | undefined {
    const query = this.queries[queryName];
    return query?.first;
  }

  /**
   * Gets the count of entities matching a named query.
   *
   * @param queryName - The name of the query (as defined in static Queries)
   * @returns Number of entities matching the query
   *
   * @example
   * const enemyCount = this.getEntityCount('enemies');
   * if (enemyCount === 0) {
   *   this.spawnWave();
   * }
   */
  protected getEntityCount(queryName: string): number {
    const query = this.queries[queryName];
    return query?.entities.length ?? 0;
  }

  /**
   * Gets typed component access for an entity.
   *
   * ODIE's Entity.c is loosely typed (Map<string, unknown>). This helper
   * provides a cleaner way to access components with proper typing,
   * reducing the need for `as unknown as` casts throughout systems.
   *
   * @template T - The component access interface (e.g., ScrewComponentAccess)
   * @param entity - The entity to get components from
   * @param _typeHint - Optional type hint parameter (unused, for type inference)
   * @returns The entity's component map cast to the specified type
   *
   * @example
   * import type { ScrewComponentAccess } from '../types/component-access';
   *
   * const screw = this.getComponents<ScrewComponentAccess>(entity).screw;
   */
  protected getComponents<T>(entity: Entity, _typeHint?: T): T {
    return entity.c as unknown as T;
  }

  /**
   * Called each frame to update the system.
   * Override this method to implement your game logic.
   *
   * @param time - Time information including deltaTime and elapsed time
   */
  abstract update(time: Time): void;
}
