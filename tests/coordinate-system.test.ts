import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShelfGenerator } from '../js/shelf-generator'

describe('Coordinate System', () => {
  let shelfGenerator: ShelfGenerator
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    shelfGenerator = new ShelfGenerator()
    shelfGenerator.currentConfig = {
      width: 91.44,  // 36" in cm
      height: 182.88, // 72" in cm
      depth: 30.48,   // 12" in cm
      materialThickness: 1.905, // 0.75" in cm
      units: 'metric'
    }
    
    // Mock DOM elements
    const mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: vi.fn()
    }
    
    shelfGenerator.container = mockContainer as any
  })

  describe('getShelfInteriorIntersection', () => {
    it('should return position in app units for metric config', () => {
      // Mock raycaster intersection
      const mockWorldPoint = { x: 0, y: 50, z: 15 } // 50cm from bottom in scene units
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [{
          point: mockWorldPoint
        }])
      } as any
      
      window.app.currentConfig.units = 'metric'
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(48.095) // 50 - 1.905 (thickness)
      expect(result.units).toBe('metric')
    })

    it('should return position in app units for imperial config', () => {
      // Switch to imperial
      shelfGenerator.currentConfig.units = 'imperial'
      shelfGenerator.currentConfig.width = 36
      shelfGenerator.currentConfig.height = 72
      shelfGenerator.currentConfig.depth = 12
      shelfGenerator.currentConfig.materialThickness = 0.75
      window.app.currentConfig.units = 'imperial'
      window.app.currentConfig.width = 36
      window.app.currentConfig.height = 72
      window.app.currentConfig.depth = 12
      window.app.currentConfig.materialThickness = 0.75
      window.app.getInteriorHeight = () => 70.5 // 72 - 1.5
      
      // Mock raycaster intersection  
      const mockWorldPoint = { x: 0, y: 20, z: 6 } // 20" from bottom in scene units
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [{
          point: mockWorldPoint
        }])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(19.25) // 20 - 0.75 (thickness)
      expect(result.units).toBe('imperial')
    })

    it('should reject positions outside shelf bounds', () => {
      // Mock raycaster intersection outside bounds
      const mockWorldPoint = { x: 0, y: 200, z: 15 } // Way above shelf
      shelfGenerator.raycaster = {
        intersectObject: vi.fn(() => [{
          point: mockWorldPoint
        }])
      } as any
      
      const result = shelfGenerator.getShelfInteriorIntersection()
      
      expect(result).toBeNull()
    })
  })

  describe('shelfToWorldPosition', () => {
    it('should correctly convert shelf position to world coordinates', () => {
      const config = {
        materialThickness: 1.905,
        units: 'metric'
      }
      
      const shelfY = 89.54 // Position in app units (cm)
      const worldY = shelfGenerator.shelfToWorldPosition(shelfY, config)
      
      expect(worldY).toBeCloseTo(91.445) // 89.54 + 1.905
    })

    it('should work with imperial units', () => {
      const config = {
        materialThickness: 0.75,
        units: 'imperial'  
      }
      
      const shelfY = 35.25 // Position in app units (inches)
      const worldY = shelfGenerator.shelfToWorldPosition(shelfY, config)
      
      expect(worldY).toBeCloseTo(36) // 35.25 + 0.75
    })
  })

  describe('detectHoveredSection', () => {
    it('should detect center section for empty shelf', () => {
      // Empty shelf
      window.app.currentConfig.shelfLayout = []
      window.app.getInteriorHeight = () => 179.17
      
      const mouseYPosition = 89.54 // Middle of shelf
      const result = shelfGenerator.detectHoveredSection(mouseYPosition)
      
      expect(result).toBeTruthy()
      expect(result.centerPosition).toBeCloseTo(89.585) // Ghost snaps to center (179.17 / 2)
      expect(result.canAdd).toBe(true)
      expect(result.sectionIndex).toBe(0)
    })

    it('should detect correct section with existing dividers', () => {
      // Shelf with one divider at 89.54
      window.app.currentConfig.shelfLayout = [{
        id: 'test1',
        position: 89.54,
        spaces: { above: { verticalDividers: 0 }, below: { verticalDividers: 0 } }
      }]
      window.app.getInteriorHeight = () => 179.17
      
      // Mouse in top section
      const mouseYPosition = 135 // Above the divider
      const result = shelfGenerator.detectHoveredSection(mouseYPosition)
      
      expect(result).toBeTruthy()
      expect(result.sectionIndex).toBe(1) // Top section
      expect(result.sectionBounds.bottom).toBeCloseTo(89.54)
      expect(result.sectionBounds.top).toBeCloseTo(179.17)
      expect(result.centerPosition).toBeCloseTo(134.355) // Middle of top section
    })

    it('should respect minimum section height requirements', () => {
      // Small shelf that can't be split
      window.app.currentConfig.shelfLayout = []
      window.app.currentConfig.units = 'metric'
      window.app.getInteriorHeight = () => 15 // Only 15cm high
      
      const mouseYPosition = 7.5 // Middle 
      const result = shelfGenerator.detectHoveredSection(mouseYPosition)
      
      expect(result).toBeTruthy()
      expect(result.canAdd).toBe(false) // Too small to split (needs 20cm for metric)
    })
  })
})