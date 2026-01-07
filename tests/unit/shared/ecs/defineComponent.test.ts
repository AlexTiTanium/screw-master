import { describe, it, expect } from 'vitest';
import { defineComponent } from '@shared/ecs/defineComponent';

// Helper type to access the instance methods (init, reset)
interface ComponentInstance<T> {
  init(data: T): void;
  reset(): void;
}

describe('defineComponent', () => {
  it('creates a component class with static NAME', () => {
    const TestComponent = defineComponent('test', { value: 0 });
    expect(TestComponent.NAME).toBe('test');
  });

  it('creates instances with default values', () => {
    const HealthComponent = defineComponent('health', {
      current: 100,
      max: 100,
    });

    const instance = new HealthComponent() as { current: number; max: number };
    expect(instance.current).toBe(100);
    expect(instance.max).toBe(100);
  });

  it('initializes with provided data via init()', () => {
    const HealthComponent = defineComponent('health', {
      current: 100,
      max: 100,
    });

    const instance = new HealthComponent() as {
      current: number;
      max: number;
    } & ComponentInstance<{ current: number; max: number }>;
    instance.init({ current: 50, max: 200 });

    expect(instance.current).toBe(50);
    expect(instance.max).toBe(200);
  });

  it('resets to default values via reset()', () => {
    const HealthComponent = defineComponent('health', {
      current: 100,
      max: 100,
    });

    const instance = new HealthComponent() as {
      current: number;
      max: number;
    } & ComponentInstance<{ current: number; max: number }>;
    instance.init({ current: 50, max: 200 });
    instance.reset();

    expect(instance.current).toBe(100);
    expect(instance.max).toBe(100);
  });

  it('allows property mutation after creation', () => {
    const PositionComponent = defineComponent('position', {
      x: 0,
      y: 0,
    });

    const instance = new PositionComponent() as { x: number; y: number };
    instance.x = 100;
    instance.y = 200;

    expect(instance.x).toBe(100);
    expect(instance.y).toBe(200);
  });

  it('creates independent instances (no shared state)', () => {
    const CounterComponent = defineComponent('counter', { count: 0 });

    const instance1 = new CounterComponent() as { count: number };
    const instance2 = new CounterComponent() as { count: number };

    instance1.count = 5;

    expect(instance1.count).toBe(5);
    expect(instance2.count).toBe(0);
  });

  it('handles complex default values', () => {
    const ComplexComponent = defineComponent('complex', {
      nested: { a: 1, b: 2 },
      array: [1, 2, 3],
    });

    const instance = new ComplexComponent() as {
      nested: { a: number; b: number };
      array: number[];
    };
    expect(instance.nested).toEqual({ a: 1, b: 2 });
    expect(instance.array).toEqual([1, 2, 3]);
  });

  it('deep clones defaults to prevent shared references', () => {
    const ArrayComponent = defineComponent('array', {
      items: [1, 2, 3],
    });

    const instance1 = new ArrayComponent() as { items: number[] };
    const instance2 = new ArrayComponent() as { items: number[] };

    instance1.items.push(4);

    expect(instance1.items).toEqual([1, 2, 3, 4]);
    expect(instance2.items).toEqual([1, 2, 3]);
  });

  it('works with empty defaults (tag component)', () => {
    const TagComponent = defineComponent('playerTag', {});

    const instance = new TagComponent();
    expect(instance).toBeDefined();
  });

  it('preserves string defaults', () => {
    const NameComponent = defineComponent('name', {
      displayName: 'Unknown',
      id: '',
    });

    const instance = new NameComponent() as {
      displayName: string;
      id: string;
    } & ComponentInstance<{ displayName: string; id: string }>;
    expect(instance.displayName).toBe('Unknown');
    expect(instance.id).toBe('');

    instance.init({ displayName: 'Player', id: 'player-1' });
    expect(instance.displayName).toBe('Player');
    expect(instance.id).toBe('player-1');
  });

  it('preserves boolean defaults', () => {
    const FlagsComponent = defineComponent('flags', {
      isActive: true,
      isDead: false,
    });

    const instance = new FlagsComponent() as {
      isActive: boolean;
      isDead: boolean;
    };
    expect(instance.isActive).toBe(true);
    expect(instance.isDead).toBe(false);
  });
});
