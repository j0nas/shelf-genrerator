/**
 * Test Setup File
 * 
 * This file sets up the global test environment for all tests.
 * It mocks the necessary browser APIs and DOM elements.
 */

import { vi } from 'vitest';

// Mock WebGL context
global.WebGLRenderingContext = vi.fn();
global.WebGL2RenderingContext = vi.fn();

// Mock Canvas and WebGL for Three.js
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: {},
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      depthFunc: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
      clearDepth: vi.fn(),
      viewport: vi.fn(),
      drawElements: vi.fn(),
      drawArrays: vi.fn(),
      getUniformLocation: vi.fn(),
      getAttribLocation: vi.fn(),
      uniform1f: vi.fn(),
      uniform1i: vi.fn(),
      uniform2f: vi.fn(),
      uniform3f: vi.fn(),
      uniform4f: vi.fn(),
      uniformMatrix4fv: vi.fn(),
      vertexAttribPointer: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      activeTexture: vi.fn(),
      TRIANGLES: 4,
      UNSIGNED_SHORT: 5123,
      FLOAT: 5126,
      RGBA: 6408,
      UNSIGNED_BYTE: 5121,
      TEXTURE_2D: 3553,
      TEXTURE_MAG_FILTER: 10240,
      TEXTURE_MIN_FILTER: 10241,
      LINEAR: 9729,
      COLOR_BUFFER_BIT: 16384,
      DEPTH_BUFFER_BIT: 256,
      DEPTH_TEST: 2929,
      LEQUAL: 515
    };
  }
  return null;
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console.log during tests (except for our ghost debugging)
const originalLog = console.log;
console.log = vi.fn((...args) => {
  const message = args.join(' ');
  // Only log test-related messages and ghost debugging
  if (message.includes('👻') || message.includes('test') || message.includes('Test')) {
    originalLog.apply(console, args);
  }
});

// Mock performance.now
global.performance = {
  now: vi.fn(() => Date.now())
};