import type { Component, ComponentClass } from '@play-co/odie';

/**
 * Creates a component class with reduced boilerplate.
 *
 * This helper function generates a fully-typed ODIE component class from
 * a name and default values, eliminating the need to manually write
 * interfaces, classes, static NAME properties, and init methods.
 *
 * @typeParam T - The shape of the component data (inferred from defaults)
 * @param name - Component identifier (must be unique, used as key in entity data)
 * @param defaults - Default values for component properties
 * @returns A ComponentClass ready for use with DefineEntity and createEntity
 *
 * @example
 * // Define a simple health component (4 lines instead of ~18)
 * export const HealthComponent = defineComponent('health', {
 *   current: 100,
 *   max: 100,
 * });
 *
 * // Use with entity definition
 * import { DefineEntity, Entity2D } from '@play-co/odie';
 * const PlayerEntity = DefineEntity(Entity2D, HealthComponent);
 *
 * // Create entity with component data
 * import { createEntity } from '@play-co/odie';
 * const player = createEntity(PlayerEntity, {
 *   health: { current: 50, max: 100 }
 * });
 *
 * @example
 * // Define a velocity component for movement
 * export const VelocityComponent = defineComponent('velocity', {
 *   x: 0,
 *   y: 0,
 *   speed: 5,
 * });
 *
 * @example
 * // Access component data from an entity
 * const health = player.c.health as ReturnType<typeof HealthComponent.prototype.init>;
 * console.log(health.current); // 50
 * health.current -= 10; // Take damage
 *
 * @example
 * // Define a tag component (empty data)
 * export const PlayerTagComponent = defineComponent('playerTag', {});
 */
export function defineComponent<T extends Record<string, unknown>>(
  name: string,
  defaults: T
): ComponentClass<T, Component<T> & T> {
  // Create a class that implements Component<T>
  const ComponentImpl = class implements Component<T> {
    static readonly NAME = name;

    constructor() {
      // Initialize with default values
      Object.assign(this, structuredClone(defaults));
    }

    init(data: T): void {
      // Merge provided data with defaults
      Object.assign(this, data);
    }

    reset(): void {
      // Reset to default values
      Object.assign(this, structuredClone(defaults));
    }
  };

  // Copy default properties to prototype for type inference
  Object.keys(defaults).forEach((key) => {
    Object.defineProperty(ComponentImpl.prototype, key, {
      value: defaults[key],
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  return ComponentImpl as unknown as ComponentClass<T, Component<T> & T>;
}

/**
 * Type helper to extract the data type from a component created with defineComponent.
 *
 * @example
 * const HealthComponent = defineComponent('health', { current: 100, max: 100 });
 * type HealthData = ComponentData<typeof HealthComponent>;
 * // HealthData = { current: number; max: number }
 */
export type ComponentData<C extends ComponentClass<unknown>> =
  C extends ComponentClass<infer D> ? D : never;
