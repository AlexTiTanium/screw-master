/**
 * ECS (Entity-Component-System) utilities for ODIE.
 *
 * This module provides helper functions to reduce boilerplate when working
 * with ODIE's ECS architecture.
 *
 * @example
 * import { defineComponent, ComponentData } from '@shared/ecs';
 *
 * // Create components with minimal boilerplate
 * const HealthComponent = defineComponent('health', {
 *   current: 100,
 *   max: 100
 * });
 *
 * // Extract component data type
 * type Health = ComponentData<typeof HealthComponent>;
 *
 * @module
 */

export { defineComponent, type ComponentData } from './defineComponent';
