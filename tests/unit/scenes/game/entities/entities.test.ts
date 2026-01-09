import { describe, it, expect } from 'vitest';

import { createEntity } from '@play-co/odie';

import {
  TestSquareEntity,
  TestSpriteEntity,
  RotatingSquareEntity,
} from '@scenes/game/entities';
import {
  TestSquareComponent,
  TestSpriteComponent,
  RotationComponent,
} from '@scenes/game/components';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Entity component access returns 'any' type from ODIE, but we know the types in tests
describe('Entity Definitions', () => {
  describe('TestSquareEntity', () => {
    it('should create entity with TestSquareComponent', () => {
      const entity = createEntity(TestSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
      });

      expect(entity).toBeDefined();
      expect(entity.c.testSquare).toBeDefined();
    });

    it('should initialize with provided size and color', () => {
      const entity = createEntity(TestSquareEntity, {
        testSquare: { size: 50, color: 0x00ff00 },
      });

      expect(entity.c.testSquare.size).toBe(50);
      expect(entity.c.testSquare.color).toBe(0x00ff00);
    });

    it('should have Entity2D properties', () => {
      const entity = createEntity(TestSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
      });

      expect(entity.position).toBeDefined();
      expect(entity.view).toBeDefined();
      expect(entity.scale).toBeDefined();
    });

    it('should allow setting position', () => {
      const entity = createEntity(TestSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
      });

      entity.position.x = 200;
      entity.position.y = 150;

      expect(entity.position.x).toBe(200);
      expect(entity.position.y).toBe(150);
    });

    it('should have accessible view container', () => {
      const entity = createEntity(TestSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
      });

      expect(entity.view).toBeDefined();
      expect(typeof entity.view.addChild).toBe('function');
    });

    it('should create multiple independent entities', () => {
      const entity1 = createEntity(TestSquareEntity, {
        testSquare: { size: 50, color: 0xff0000 },
      });

      const entity2 = createEntity(TestSquareEntity, {
        testSquare: { size: 100, color: 0x00ff00 },
      });

      expect(entity1.c.testSquare.size).toBe(50);
      expect(entity2.c.testSquare.size).toBe(100);
      expect(entity1).not.toBe(entity2);
    });

    it('should have component with correct NAME', () => {
      const entity = createEntity(TestSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
      });

      expect(entity.c.testSquare.constructor.NAME).toBe(
        TestSquareComponent.NAME
      );
    });
  });

  describe('TestSpriteEntity', () => {
    it('should create entity with TestSpriteComponent', () => {
      const entity = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/test.png' },
      });

      expect(entity).toBeDefined();
      expect(entity.c.testSprite).toBeDefined();
    });

    it('should initialize with provided assetPath', () => {
      const entity = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/player.png' },
      });

      expect(entity.c.testSprite.assetPath).toBe('images/player.png');
    });

    it('should have Entity2D properties', () => {
      const entity = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/test.png' },
      });

      expect(entity.position).toBeDefined();
      expect(entity.view).toBeDefined();
      expect(entity.scale).toBeDefined();
    });

    it('should allow setting position', () => {
      const entity = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/test.png' },
      });

      entity.position.x = 300;
      entity.position.y = 250;

      expect(entity.position.x).toBe(300);
      expect(entity.position.y).toBe(250);
    });

    it('should have accessible view container', () => {
      const entity = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/test.png' },
      });

      expect(entity.view).toBeDefined();
      expect(typeof entity.view.addChild).toBe('function');
    });

    it('should create multiple independent entities', () => {
      const entity1 = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/sprite1.png' },
      });

      const entity2 = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/sprite2.png' },
      });

      expect(entity1.c.testSprite.assetPath).toBe('images/sprite1.png');
      expect(entity2.c.testSprite.assetPath).toBe('images/sprite2.png');
      expect(entity1).not.toBe(entity2);
    });

    it('should have component with correct NAME', () => {
      const entity = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/test.png' },
      });

      expect(entity.c.testSprite.constructor.NAME).toBe(
        TestSpriteComponent.NAME
      );
    });
  });

  describe('RotatingSquareEntity', () => {
    it('should create entity with TestSquareComponent and RotationComponent', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: Math.PI },
      });

      expect(entity).toBeDefined();
      expect(entity.c.testSquare).toBeDefined();
      expect(entity.c.rotation).toBeDefined();
    });

    it('should initialize with provided square properties', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 75, color: 0x0000ff },
        rotation: { speed: Math.PI / 2 },
      });

      expect(entity.c.testSquare.size).toBe(75);
      expect(entity.c.testSquare.color).toBe(0x0000ff);
    });

    it('should initialize with provided rotation speed', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: Math.PI / 4 },
      });

      expect(entity.c.rotation.speed).toBe(Math.PI / 4);
    });

    it('should have Entity2D properties', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: 0 },
      });

      expect(entity.position).toBeDefined();
      expect(entity.view).toBeDefined();
      expect(entity.scale).toBeDefined();
    });

    it('should allow setting position', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: 0 },
      });

      entity.position.x = 400;
      entity.position.y = 300;

      expect(entity.position.x).toBe(400);
      expect(entity.position.y).toBe(300);
    });

    it('should have accessible view container', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: 0 },
      });

      expect(entity.view).toBeDefined();
      expect(typeof entity.view.addChild).toBe('function');
    });

    it('should create multiple independent entities', () => {
      const entity1 = createEntity(RotatingSquareEntity, {
        testSquare: { size: 50, color: 0xff0000 },
        rotation: { speed: 1 },
      });

      const entity2 = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0x00ff00 },
        rotation: { speed: 2 },
      });

      expect(entity1.c.testSquare.size).toBe(50);
      expect(entity2.c.testSquare.size).toBe(100);
      expect(entity1.c.rotation.speed).toBe(1);
      expect(entity2.c.rotation.speed).toBe(2);
      expect(entity1).not.toBe(entity2);
    });

    it('should have components with correct NAMEs', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: 0 },
      });

      expect(entity.c.testSquare.constructor.NAME).toBe(
        TestSquareComponent.NAME
      );
      expect(entity.c.rotation.constructor.NAME).toBe(RotationComponent.NAME);
    });

    it('should allow independent mutation of components', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: 1 },
      });

      entity.c.testSquare.size = 150;
      entity.c.rotation.speed = 2;

      expect(entity.c.testSquare.size).toBe(150);
      expect(entity.c.testSquare.color).toBe(0xff0000); // Unchanged
      expect(entity.c.rotation.speed).toBe(2);
    });

    it('should support zero rotation speed', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: 0 },
      });

      expect(entity.c.rotation.speed).toBe(0);
    });

    it('should support negative rotation speed', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: -Math.PI },
      });

      expect(entity.c.rotation.speed).toBe(-Math.PI);
    });

    it('should support very fast rotation speed', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: Math.PI * 10 },
      });

      expect(entity.c.rotation.speed).toBe(Math.PI * 10);
    });
  });

  describe('Entity type compatibility', () => {
    it('should allow TestSquareEntity as Entity2D', () => {
      const entity = createEntity(TestSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
      });

      // Should have Entity2D interface
      expect(entity.position).toBeDefined();
      expect(entity.view).toBeDefined();
    });

    it('should allow TestSpriteEntity as Entity2D', () => {
      const entity = createEntity(TestSpriteEntity, {
        testSprite: { assetPath: 'images/test.png' },
      });

      // Should have Entity2D interface
      expect(entity.position).toBeDefined();
      expect(entity.view).toBeDefined();
    });

    it('should allow RotatingSquareEntity as Entity2D', () => {
      const entity = createEntity(RotatingSquareEntity, {
        testSquare: { size: 100, color: 0xff0000 },
        rotation: { speed: 0 },
      });

      // Should have Entity2D interface
      expect(entity.position).toBeDefined();
      expect(entity.view).toBeDefined();
    });
  });
});
