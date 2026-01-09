import { describe, it, expect, beforeEach, vi } from 'vitest';

import { setupErrorCapture } from '@shared/debug/errorCapture';

// Mock PromiseRejectionEvent for jsdom
class MockPromiseRejectionEvent extends Event {
  promise: Promise<unknown>;
  reason: unknown;

  constructor(
    type: string,
    init: { promise: Promise<unknown>; reason: unknown }
  ) {
    super(type);
    this.promise = init.promise;
    this.reason = init.reason;
  }
}

// Add to global
(
  globalThis as unknown as {
    PromiseRejectionEvent?: typeof MockPromiseRejectionEvent;
  }
).PromiseRejectionEvent = MockPromiseRejectionEvent;

describe('Error Capture', () => {
  let mockCaptureError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock captureError function
    mockCaptureError = vi.fn();

    // Setup mock game test harness
    (
      window as unknown as {
        __gameTest?: { captureError: typeof mockCaptureError };
      }
    ).__gameTest = {
      captureError: mockCaptureError,
    };
  });

  describe('setupErrorCapture', () => {
    it('should setup error capture without throwing', () => {
      expect(() => {
        setupErrorCapture();
      }).not.toThrow();
    });

    it('should capture window error events with Error object', () => {
      setupErrorCapture();

      const testError = new Error('Test error message');
      const errorEvent = new ErrorEvent('error', {
        error: testError,
        message: 'Test error message',
        filename: 'test.ts',
        lineno: 42,
        colno: 10,
      });

      window.dispatchEvent(errorEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      // Get the last call (since other tests may have added listeners)
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      expect(lastCall![0]).toBe(testError);
      expect(lastCall![1]).toBe('test.ts:42:10');
    });

    it('should capture error with message when error object is not available', () => {
      setupErrorCapture();

      const errorEvent = new ErrorEvent('error', {
        message: 'String error message',
        filename: 'script.js',
        lineno: 100,
        colno: 5,
      });

      window.dispatchEvent(errorEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const capturedError = lastCall![0];
      expect(capturedError).toBeInstanceOf(Error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(capturedError.message).toBe('String error message');
      expect(lastCall![1]).toBe('script.js:100:5');
    });

    it('should capture unhandled promise rejections with Error', () => {
      setupErrorCapture();

      const testError = new Error('Promise rejection error');
      const rejected = Promise.reject(testError);
      const rejectionEvent = new MockPromiseRejectionEvent(
        'unhandledrejection',
        {
          promise: rejected,
          reason: testError,
        }
      );

      window.dispatchEvent(rejectionEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      expect(lastCall![0]).toBe(testError);
      expect(lastCall![1]).toBe('unhandledrejection');

      // Catch the rejection to prevent Vitest from complaining
      rejected.catch(() => {
        /* handled */
      });
    });

    it('should capture promise rejection with string reason', () => {
      setupErrorCapture();

      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      const rejected = Promise.reject('String rejection');
      const rejectionEvent = new MockPromiseRejectionEvent(
        'unhandledrejection',
        {
          promise: rejected,
          reason: 'String rejection',
        }
      );

      window.dispatchEvent(rejectionEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const capturedError = lastCall![0];
      expect(capturedError).toBeInstanceOf(Error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(capturedError.message).toBe('String rejection');
      expect(lastCall![1]).toBe('unhandledrejection');

      rejected.catch(() => {
        /* handled */
      });
    });

    it('should capture promise rejection with number reason', () => {
      setupErrorCapture();

      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      const rejected = Promise.reject(42);
      const rejectionEvent = new MockPromiseRejectionEvent(
        'unhandledrejection',
        {
          promise: rejected,
          reason: 42,
        }
      );

      window.dispatchEvent(rejectionEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const capturedError = lastCall![0];
      expect(capturedError).toBeInstanceOf(Error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(capturedError.message).toBe('42');

      rejected.catch(() => {
        /* handled */
      });
    });

    it('should capture promise rejection with object reason', () => {
      setupErrorCapture();

      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      const rejected = Promise.reject({ code: 'ERROR' });
      const rejectionEvent = new MockPromiseRejectionEvent(
        'unhandledrejection',
        {
          promise: rejected,
          reason: { code: 'ERROR' },
        }
      );

      window.dispatchEvent(rejectionEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const capturedError = lastCall![0];
      expect(capturedError).toBeInstanceOf(Error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(capturedError.message).toBe('[object Object]');

      rejected.catch(() => {
        /* handled */
      });
    });

    it('should not throw if __gameTest is not available during error', () => {
      delete (window as { __gameTest?: unknown }).__gameTest;

      setupErrorCapture();

      const errorEvent = new ErrorEvent('error', {
        error: new Error('Test error'),
        message: 'Test error',
        filename: 'test.ts',
        lineno: 1,
        colno: 1,
      });

      // Should not throw
      expect(() => window.dispatchEvent(errorEvent)).not.toThrow();
    });

    it('should not throw if __gameTest is not available during rejection', () => {
      delete (window as { __gameTest?: unknown }).__gameTest;

      setupErrorCapture();

      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      const rejected = Promise.reject('test');
      const rejectionEvent = new MockPromiseRejectionEvent(
        'unhandledrejection',
        {
          promise: rejected,
          reason: 'test',
        }
      );

      // Should not throw
      expect(() => window.dispatchEvent(rejectionEvent)).not.toThrow();

      rejected.catch(() => {
        /* handled */
      });
    });

    it('should handle missing filename, lineno, colno', () => {
      setupErrorCapture();

      const errorEvent = new ErrorEvent('error', {
        error: new Error('Test'),
        message: 'Test',
      });

      window.dispatchEvent(errorEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      // ErrorEvent uses default values (empty string for filename, 0 for lineno/colno)
      expect(lastCall![1]).toBe(':0:0');
    });

    it('should capture Error instances correctly', () => {
      setupErrorCapture();

      const customError = new TypeError('Type error occurred');
      const errorEvent = new ErrorEvent('error', {
        error: customError,
        message: 'Type error occurred',
        filename: 'app.ts',
        lineno: 50,
        colno: 20,
      });

      window.dispatchEvent(errorEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      expect(lastCall![0]).toBe(customError);
      expect(lastCall![0]).toBeInstanceOf(TypeError);
    });

    it('should preserve error type when capturing promise rejections', () => {
      setupErrorCapture();

      const rangeError = new RangeError('Out of range');
      const rejected = Promise.reject(rangeError);
      const rejectionEvent = new MockPromiseRejectionEvent(
        'unhandledrejection',
        {
          promise: rejected,
          reason: rangeError,
        }
      );

      window.dispatchEvent(rejectionEvent);

      expect(mockCaptureError).toHaveBeenCalled();
      const lastCall =
        mockCaptureError.mock.calls[mockCaptureError.mock.calls.length - 1];
      expect(lastCall![0]).toBe(rangeError);
      expect(lastCall![0]).toBeInstanceOf(RangeError);

      rejected.catch(() => {
        /* handled */
      });
    });
  });
});
