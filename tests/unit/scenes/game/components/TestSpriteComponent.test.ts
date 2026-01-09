import { describe, it, expect } from 'vitest';

import { TestSpriteComponent } from '@scenes/game/components/TestSpriteComponent';

describe('TestSpriteComponent', () => {
  describe('component definition', () => {
    it('should have correct NAME property', () => {
      expect(TestSpriteComponent.NAME).toBe('testSprite');
    });

    it('should have default assetPath of empty string', () => {
      const component = new TestSpriteComponent();
      expect(component.assetPath).toBe('');
    });
  });

  describe('init', () => {
    it('should initialize with provided assetPath', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/player.png' });

      expect(component.assetPath).toBe('images/player.png');
    });

    it('should initialize with relative path', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprites/enemy.png' });

      expect(component.assetPath).toBe('images/sprites/enemy.png');
    });

    it('should initialize with absolute path', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: '/assets/textures/background.png' });

      expect(component.assetPath).toBe('/assets/textures/background.png');
    });

    it('should initialize with URL', () => {
      const component = new TestSpriteComponent();
      component.init!({
        assetPath: 'https://example.com/sprite.png',
      });

      expect(component.assetPath).toBe('https://example.com/sprite.png');
    });

    it('should initialize with empty string', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: '' });

      expect(component.assetPath).toBe('');
    });

    it('should initialize with nested path', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/characters/player/idle.png' });

      expect(component.assetPath).toBe('images/characters/player/idle.png');
    });

    it('should preserve special characters in path', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite-name_v2.final.png' });

      expect(component.assetPath).toBe('images/sprite-name_v2.final.png');
    });
  });

  describe('reset', () => {
    it('should reset assetPath to default value', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/player.png' });

      component.reset!();

      expect(component.assetPath).toBe('');
    });

    it('should be reusable after reset', () => {
      const component = new TestSpriteComponent();

      // First use
      component.init!({ assetPath: 'images/sprite1.png' });
      expect(component.assetPath).toBe('images/sprite1.png');

      // Reset
      component.reset!();
      expect(component.assetPath).toBe('');

      // Second use
      component.init!({ assetPath: 'images/sprite2.png' });
      expect(component.assetPath).toBe('images/sprite2.png');
    });
  });

  describe('data mutation', () => {
    it('should allow direct mutation of assetPath', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/original.png' });

      component.assetPath = 'images/updated.png';

      expect(component.assetPath).toBe('images/updated.png');
    });

    it('should maintain assetPath value across multiple reads', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/test.png' });

      const path1 = component.assetPath;
      const path2 = component.assetPath;

      expect(path1).toBe(path2);
      expect(path1).toBe('images/test.png');
    });
  });

  describe('edge cases', () => {
    it('should handle path with spaces', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/my sprite.png' });

      expect(component.assetPath).toBe('images/my sprite.png');
    });

    it('should handle path with backslashes', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images\\sprites\\player.png' });

      expect(component.assetPath).toBe('images\\sprites\\player.png');
    });

    it('should handle very long paths', () => {
      const component = new TestSpriteComponent();
      const longPath =
        'images/very/deeply/nested/directory/structure/with/many/levels/sprite.png';
      component.init!({ assetPath: longPath });

      expect(component.assetPath).toBe(longPath);
    });

    it('should handle path with query parameters', () => {
      const component = new TestSpriteComponent();
      component.init!({
        assetPath: 'images/sprite.png?v=1.2.3&cache=false',
      });

      expect(component.assetPath).toBe('images/sprite.png?v=1.2.3&cache=false');
    });

    it('should handle path with hash', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite.png#frame2' });

      expect(component.assetPath).toBe('images/sprite.png#frame2');
    });

    it('should handle data URL', () => {
      const component = new TestSpriteComponent();
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS';
      component.init!({ assetPath: dataUrl });

      expect(component.assetPath).toBe(dataUrl);
    });

    it('should handle unicode characters in path', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite_🎮.png' });

      expect(component.assetPath).toBe('images/sprite_🎮.png');
    });
  });

  describe('common file extensions', () => {
    it('should handle .png files', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite.png' });

      expect(component.assetPath).toBe('images/sprite.png');
    });

    it('should handle .jpg files', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite.jpg' });

      expect(component.assetPath).toBe('images/sprite.jpg');
    });

    it('should handle .webp files', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite.webp' });

      expect(component.assetPath).toBe('images/sprite.webp');
    });

    it('should handle .svg files', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite.svg' });

      expect(component.assetPath).toBe('images/sprite.svg');
    });

    it('should handle uppercase extensions', () => {
      const component = new TestSpriteComponent();
      component.init!({ assetPath: 'images/sprite.PNG' });

      expect(component.assetPath).toBe('images/sprite.PNG');
    });
  });
});
