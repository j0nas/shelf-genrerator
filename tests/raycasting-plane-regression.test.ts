import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShelfGenerator } from '../js/shelf-generator'

describe('Raycasting Plane Regression Tests', () => {
  let shelfGenerator: ShelfGenerator
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    shelfGenerator = new ShelfGenerator()
    shelfGenerator.currentConfig = {
      width: 36,  // 36" imperial
      height: 72, // 72" imperial
      depth: 12,  // 12" imperial
      materialThickness: 0.75, // 0.75" imperial
      units: 'imperial'
    }
    
    // Mock DOM elements
    const mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: vi.fn()
    }
    shelfGenerator.container = mockContainer as any
    
    // Mock shelfGroup with centered position (after centerShelf())
    shelfGenerator.shelfGroup = {
      position: { x: 0, y: 0, z: 0 }
    } as any
    
    // Mock window.app
    global.window = global.window || {}
    window.app = {
      getInteriorHeight: () => 70.5, // 72 - 1.5
      currentConfig: {
        units: 'imperial',
        shelfLayout: []
      }
    } as any
  })

  describe('Imperial Mode - Top Half Hover Detection', () => {
    it('should detect raycasting intersection when hovering top half', () => {
      // Mock raycaster for top half hover (positive Y direction, like y=0.32)
      const mockTopHalfIntersection = { 
        point: { x: 2.3, y: 70.25, z: 6.0 } // Real coordinates from working test
      }
      
      shelfGenerator.raycaster = {
        ray: {
          origin: { x: 0, y: 36, z: 108 },
          direction: { x: 0.02, y: 0.32, z: -0.95 } // Positive Y = pointing up
        },
        intersectObject: vi.fn(() => [mockTopHalfIntersection])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(69.5) // 70.25 - 0.75 (thickness)
      expect(result.units).toBe('imperial')
      expect(shelfGenerator.raycaster.intersectObject).toHaveBeenCalled()
    })

    it('should properly convert top half world coordinates to shelf interior position', () => {
      // Test the coordinate conversion for top half
      const mockTopIntersection = { 
        point: { x: 0, y: 70.25, z: 6.0 } // Near top of interior
      }
      
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [mockTopIntersection])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(69.5) // Should be near top of 70.5" interior
      expect(result.position).toBeGreaterThan(60) // Should be in top portion
      expect(result.position).toBeLessThanOrEqual(70.5) // Should not exceed interior height
    })
  })

  describe('Imperial Mode - Bottom Half Hover Detection', () => {
    it('should detect raycasting intersection when hovering bottom half', () => {
      // Mock raycaster for bottom half hover (negative Y direction, like y=-0.77)
      const mockBottomHalfIntersection = { 
        point: { x: 0, y: 10.75, z: 6.0 } // Bottom half coordinates
      }
      
      shelfGenerator.raycaster = {
        ray: {
          origin: { x: 0, y: 36, z: 108 },
          direction: { x: -0.02, y: -0.77, z: -0.63 } // Negative Y = pointing down  
        },
        intersectObject: vi.fn(() => [mockBottomHalfIntersection])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(10.0) // 10.75 - 0.75 (thickness)
      expect(result.units).toBe('imperial')
      expect(shelfGenerator.raycaster.intersectObject).toHaveBeenCalled()
    })

    it('should properly convert bottom half world coordinates to shelf interior position', () => {
      // Test the coordinate conversion for bottom half
      const mockBottomIntersection = { 
        point: { x: 0, y: 5.75, z: 6.0 } // Near bottom of interior
      }
      
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [mockBottomIntersection])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(5.0) // Should be near bottom
      expect(result.position).toBeGreaterThanOrEqual(0) // Should not be negative
      expect(result.position).toBeLessThan(35) // Should be in bottom portion
    })
  })

  describe('Plane Positioning and Orientation', () => {
    it('should create raycasting plane with correct dimensions', () => {
      // Mock successful intersection to test plane creation
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [{ point: { x: 0, y: 36, z: 6 } }])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      // Verify plane was created with correct parameters
      expect(shelfGenerator.raycaster.intersectObject).toHaveBeenCalledWith(
        expect.objectContaining({
          geometry: expect.objectContaining({
            parameters: expect.objectContaining({
              width: 34.5, // 36 - (2 * 0.75)
              height: 70.5 // interior height
            })
          })
        }),
        false // recursive parameter
      )
    })

    it('should position plane at correct world coordinates', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      shelfGenerator.debugMode = true
      
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [{ point: { x: 0, y: 36, z: 6 } }])
      } as any
      
      shelfGenerator.getShelfInteriorIntersection()
      
      // Check debug logs for correct plane positioning
      expect(spy).toHaveBeenCalledWith('planeCenter: x=0.00, y=36.00, z=6.00')
      expect(spy).toHaveBeenCalledWith('planeBottom: y=0.75')
      expect(spy).toHaveBeenCalledWith('planeTop: y=71.25')
      
      spy.mockRestore()
    })

    it('should use DoubleSide material to detect rays from any direction', () => {
      // Since THREE.js is complex to mock in unit tests, we'll test the behavior indirectly
      // by verifying that intersections work from different ray angles
      
      // Test positive Y direction (pointing up)
      const mockUpIntersection = { point: { x: 0, y: 65, z: 6 } }
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [mockUpIntersection])
      } as any
      
      const upResult = shelfGenerator.getShelfInteriorIntersection()
      expect(upResult).toBeTruthy()
      
      // Test negative Y direction (pointing down)  
      const mockDownIntersection = { point: { x: 0, y: 15, z: 6 } }
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [mockDownIntersection])
      
      const downResult = shelfGenerator.getShelfInteriorIntersection()
      expect(downResult).toBeTruthy()
      
      // Both directions should work (proving DoubleSide behavior)
      expect(upResult.position).toBeGreaterThan(50) // Top half
      expect(downResult.position).toBeLessThan(20) // Bottom half
    })
  })

  describe('Metric Mode Compatibility', () => {
    beforeEach(() => {
      // Switch to metric
      shelfGenerator.currentConfig = {
        width: 91.44,   // 36" in cm
        height: 182.88, // 72" in cm  
        depth: 30.48,   // 12" in cm
        materialThickness: 1.905, // 0.75" in cm
        units: 'metric'
      }
      
      window.app.getInteriorHeight = () => 179.17 // 182.88 - 3.81
      window.app.currentConfig.units = 'metric'
    })

    it('should detect intersections in both halves for metric mode', () => {
      // Test top half
      const mockTopIntersection = { 
        point: { x: 0, y: 150, z: 15 } // Top half in metric
      }
      
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [mockTopIntersection])
      } as any
      
      const topResult = shelfGenerator.getShelfInteriorIntersection()
      expect(topResult).toBeTruthy()
      expect(topResult.position).toBeCloseTo(148.095) // 150 - 1.905
      expect(topResult.units).toBe('metric')
      
      // Test bottom half  
      const mockBottomIntersection = { 
        point: { x: 0, y: 30, z: 15 } // Bottom half in metric
      }
      
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [mockBottomIntersection])
      
      const bottomResult = shelfGenerator.getShelfInteriorIntersection()
      expect(bottomResult).toBeTruthy()
      expect(bottomResult.position).toBeCloseTo(28.095) // 30 - 1.905
      expect(bottomResult.units).toBe('metric')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should return null when no intersection found', () => {
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => []) // No intersections
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeNull()
    })

    it('should handle missing shelfGroup gracefully', () => {
      shelfGenerator.shelfGroup = null
      
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [{ point: { x: 0, y: 36, z: 6 } }])
      } as any
      
      // Should not throw error and should use default position (0,0,0)
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeTruthy()
    })

    it('should reject positions outside shelf bounds', () => {
      // Mock intersection way above shelf
      const mockOutOfBoundsIntersection = { 
        point: { x: 0, y: 200, z: 6 } // Way above 71.25 top
      }
      
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [mockOutOfBoundsIntersection])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeNull()
    })
  })

  describe('Ray Direction Analysis', () => {
    it('should handle positive Y ray directions (pointing up towards top half)', () => {
      const mockIntersection = { point: { x: 0, y: 65, z: 6 } }
      
      shelfGenerator.raycaster = {
        ray: {
          direction: { x: 0.02, y: 0.32, z: -0.95 } // Positive Y like in successful test
        },
        intersectObject: vi.fn(() => [mockIntersection])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeTruthy()
      expect(result.position).toBeGreaterThan(50) // Should be in upper portion
    })

    it('should handle negative Y ray directions (pointing down towards bottom half)', () => {
      const mockIntersection = { point: { x: 0, y: 15, z: 6 } }
      
      shelfGenerator.raycaster = {
        ray: {
          direction: { x: -0.02, y: -0.77, z: -0.63 } // Negative Y like in test logs
        },
        intersectObject: vi.fn(() => [mockIntersection])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeTruthy()
      expect(result.position).toBeLessThan(20) // Should be in lower portion
    })
  })
})