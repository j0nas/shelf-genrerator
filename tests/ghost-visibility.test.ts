import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShelfGenerator } from '../js/shelf-generator'

describe('Ghost Divider Visibility Issues', () => {
  let shelfGenerator: ShelfGenerator
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    shelfGenerator = new ShelfGenerator()
    
    // Mock scene and shelfGroup
    shelfGenerator.scene = {
      add: vi.fn(),
      remove: vi.fn()
    } as any
    
    shelfGenerator.shelfGroup = {
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
      position: { x: 0, y: 0, z: 0, sub: vi.fn(), copy: vi.fn() }
    } as any
    
    // Mock raycaster
    shelfGenerator.raycaster = {
      setFromCamera: vi.fn(),
      intersectObject: vi.fn()
    } as any
    
    // Mock mouse
    shelfGenerator.mouse = { x: 0, y: 0 } as any
  })

  describe('Imperial Units - Bottom Half', () => {
    beforeEach(() => {
      // Set up imperial configuration
      shelfGenerator.currentConfig = {
        width: 36,        // 36 inches
        height: 72,       // 72 inches  
        depth: 12,        // 12 inches
        materialThickness: 0.75, // 0.75 inches
        units: 'imperial'
      }
      
      window.app.currentConfig = {
        ...shelfGenerator.currentConfig,
        shelfLayout: []
      }
      
      window.app.getInteriorHeight = () => 70.5 // 72 - 1.5
      window.app.toInches = (val) => val // Already in inches
      window.app.fromInches = (val) => val // Already in inches
    })

    it('should show ghost divider when hovering bottom half of imperial shelf', () => {
      // Mock intersection in bottom half
      const worldPoint = { x: 0, y: 20, z: 6 } // 20" from bottom (bottom half of 72" shelf)
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(19.25) // 20 - 0.75 thickness
      expect(result.units).toBe('imperial')
      
      // Test section detection
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
    })

    it('should show ghost divider when hovering top half of imperial shelf', () => {
      // Mock intersection in top half  
      const worldPoint = { x: 0, y: 50, z: 6 } // 50" from bottom (top half)
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(49.25) // 50 - 0.75 thickness
      
      // Test section detection
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
    })
  })

  describe('Metric Units - Any Position', () => {
    beforeEach(() => {
      // Set up metric configuration
      shelfGenerator.currentConfig = {
        width: 91.44,     // 36" in cm
        height: 182.88,   // 72" in cm
        depth: 30.48,     // 12" in cm
        materialThickness: 1.905, // 0.75" in cm
        units: 'metric'
      }
      
      window.app.currentConfig = {
        ...shelfGenerator.currentConfig,
        shelfLayout: []
      }
      
      window.app.getInteriorHeight = () => 179.17 // 182.88 - 3.81
      window.app.toInches = (cm) => cm / 2.54
      window.app.fromInches = (inches) => inches * 2.54
    })

    it('should show ghost divider when hovering bottom half of metric shelf', () => {
      // Mock intersection in bottom half
      const worldPoint = { x: 0, y: 50, z: 15 } // 50cm from bottom
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(48.095) // 50 - 1.905 thickness
      expect(result.units).toBe('metric')
      
      // Test section detection
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
    })

    it('should show ghost divider when hovering top half of metric shelf', () => {
      // Mock intersection in top half
      const worldPoint = { x: 0, y: 130, z: 15 } // 130cm from bottom (top half)
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(128.095) // 130 - 1.905 thickness
      
      // Test section detection  
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
    })

    it('should show ghost divider when hovering middle of metric shelf', () => {
      // Mock intersection in middle
      const worldPoint = { x: 0, y: 91.44, z: 15 } // Middle of shelf
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(89.535) // 91.44 - 1.905 thickness
      
      // Test section detection
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should return null when mouse is outside shelf bounds', () => {
      shelfGenerator.currentConfig = {
        width: 91.44,
        height: 182.88,
        depth: 30.48,
        materialThickness: 1.905,
        units: 'metric'
      }
      
      window.app.getInteriorHeight = () => 179.17
      
      // Mock intersection way above shelf
      const worldPoint = { x: 0, y: 300, z: 15 } // Way above
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeNull()
    })

    it('should return null when raycaster finds no intersection', () => {
      shelfGenerator.currentConfig = {
        width: 91.44,
        height: 182.88,
        depth: 30.48,
        materialThickness: 1.905,
        units: 'metric'
      }
      
      // Mock no intersection
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [])
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeNull()
    })
  })
})