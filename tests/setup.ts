import { beforeAll, afterAll, vi } from 'vitest';

// Mock canvas for PixiJS
beforeAll(() => {
  const mockCanvas = {
    getContext: vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
    })),
    width: 1024,
    height: 768,
    style: {},
  };

  vi.stubGlobal(
    'HTMLCanvasElement',
    class {
      getContext = mockCanvas.getContext;
      width = mockCanvas.width;
      height = mockCanvas.height;
      style = mockCanvas.style;
    }
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});
