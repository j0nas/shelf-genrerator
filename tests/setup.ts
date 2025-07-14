// Global test setup
import { vi } from 'vitest'

// Mock Three.js for testing
global.THREE = {
  Vector2: vi.fn(() => ({ x: 0, y: 0 })),
  Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  Raycaster: vi.fn(() => ({
    setFromCamera: vi.fn(),
    intersectObject: vi.fn(() => [])
  })),
  Scene: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn()
  })),
  Group: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
    position: { x: 0, y: 0, z: 0, sub: vi.fn(), copy: vi.fn() }
  })),
  Box3: vi.fn(() => ({
    setFromObject: vi.fn(() => ({
      getCenter: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
      max: { y: 10 },
      min: { y: 0 }
    }))
  })),
  PlaneGeometry: vi.fn(),
  BoxGeometry: vi.fn(),
  MeshBasicMaterial: vi.fn(),
  MeshLambertMaterial: vi.fn(),
  Mesh: vi.fn(() => ({
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    userData: {},
    material: {},
    geometry: { dispose: vi.fn() },
    dispose: vi.fn()
  })),
  MOUSE: { ROTATE: 0, DOLLY: 1, PAN: 2 },
  TOUCH: { ROTATE: 0, DOLLY_PAN: 1 },
  DoubleSide: 2,
  PCFSoftShadowMap: 1
}

// Mock window.app for tests
global.window = {
  ...global.window,
  app: {
    currentConfig: {
      width: 91.44, // 36 inches in cm
      height: 182.88, // 72 inches in cm  
      depth: 30.48, // 12 inches in cm
      materialThickness: 1.905, // 0.75 inches in cm
      units: 'metric',
      shelfLayout: []
    },
    getInteriorHeight: () => 179.17, // interior height in cm
    toInches: (cm) => cm / 2.54,
    fromInches: (inches) => inches * 2.54,
    addDividerAtPosition: vi.fn(),
    updateDivider: vi.fn(),
    removeDivider: vi.fn()
  }
}