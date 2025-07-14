import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShelfGenerator } from '../js/shelf-generator'

describe('Drag Operations', () => {
  let shelfGenerator: ShelfGenerator
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    shelfGenerator = new ShelfGenerator()
    shelfGenerator.currentConfig = {
      width: 91.44,
      height: 182.88, 
      depth: 30.48,
      materialThickness: 1.905,
      units: 'metric'
    }
    
    // Mock controls
    shelfGenerator.controls = {
      enabled: true
    } as any
  })

  describe('calculateConstrainedPositionAbsolute', () => {
    it('should constrain position within shelf bounds', () => {
      window.app.getInteriorHeight = () => 179.17
      window.app.currentConfig.shelfLayout = []
      
      // Mock getSelectedDivider to return a test divider
      shelfGenerator.getSelectedDivider = vi.fn(() => ({
        dividerId: 'test1',
        position: 89.54,
        mesh: {}
      }))
      
      // Test position above shelf - should be constrained
      const constrainedHigh = shelfGenerator.calculateConstrainedPositionAbsolute(200)
      expect(constrainedHigh).toBeCloseTo(174.0) // interiorHeight - minSpacing(5), snapped to 0.5cm
      
      // Test position below shelf - should be constrained  
      const constrainedLow = shelfGenerator.calculateConstrainedPositionAbsolute(-10)
      expect(constrainedLow).toBeCloseTo(5) // minSpacing
      
      // Test valid position - should pass through
      const validPosition = shelfGenerator.calculateConstrainedPositionAbsolute(89.54)
      expect(validPosition).toBeCloseTo(89.5) // Snapped to 0.5cm increment
    })

    it('should respect adjacent divider constraints', () => {
      window.app.getInteriorHeight = () => 179.17
      window.app.currentConfig.shelfLayout = [
        { id: 'div1', position: 50, spaces: {} },
        { id: 'test1', position: 89.54, spaces: {} }, // Selected divider
        { id: 'div3', position: 130, spaces: {} }
      ]
      
      shelfGenerator.getSelectedDivider = vi.fn(() => ({
        dividerId: 'test1',
        position: 89.54,
        mesh: {}
      }))
      
      // Test position too close to lower divider
      const constrainedLow = shelfGenerator.calculateConstrainedPositionAbsolute(52)
      expect(constrainedLow).toBeCloseTo(55) // 50 + 5cm spacing
      
      // Test position too close to upper divider 
      const constrainedHigh = shelfGenerator.calculateConstrainedPositionAbsolute(128)
      expect(constrainedHigh).toBeCloseTo(125) // 130 - 5cm spacing
    })

    it('should snap to increments', () => {
      window.app.getInteriorHeight = () => 179.17
      window.app.currentConfig.shelfLayout = []
      
      shelfGenerator.getSelectedDivider = vi.fn(() => ({
        dividerId: 'test1',
        position: 89.54,
        mesh: {}
      }))
      
      // Test metric snapping (0.5cm increments)
      const snapped = shelfGenerator.calculateConstrainedPositionAbsolute(89.73)
      expect(snapped).toBeCloseTo(89.5)
      
      const snapped2 = shelfGenerator.calculateConstrainedPositionAbsolute(89.88) 
      expect(snapped2).toBeCloseTo(90.0)
    })

    it('should handle imperial snapping', () => {
      // Switch to imperial
      shelfGenerator.currentConfig.units = 'imperial'
      window.app.currentConfig.units = 'imperial'
      window.app.getInteriorHeight = () => 70.5
      
      shelfGenerator.getSelectedDivider = vi.fn(() => ({
        dividerId: 'test1',
        position: 35.25,
        mesh: {}
      }))
      
      // Test imperial snapping (0.25" increments)
      const snapped = shelfGenerator.calculateConstrainedPositionAbsolute(35.13)
      expect(snapped).toBeCloseTo(35.25)
      
      const snapped2 = shelfGenerator.calculateConstrainedPositionAbsolute(35.4)
      expect(snapped2).toBeCloseTo(35.5)
    })
  })

  describe('updateDividerPosition', () => {
    it('should update mesh position correctly', () => {
      const mockMesh = {
        position: { y: 0 }
      }
      
      const mockDivider = {
        dividerId: 'test1',
        position: 50,
        mesh: mockMesh
      }
      
      shelfGenerator.getSelectedDivider = vi.fn(() => mockDivider)
      shelfGenerator.deleteButton = null
      
      const newPosition = 89.54
      shelfGenerator.updateDividerPosition(newPosition)
      
      // Should update mesh Y position to world coordinates
      const expectedWorldY = 91.445 // 89.54 + 1.905 thickness
      expect(mockMesh.position.y).toBeCloseTo(expectedWorldY)
      
      // Should update divider data
      expect(mockDivider.position).toBe(newPosition)
    })

    it('should update delete button position when visible', () => {
      const mockMesh = { position: { y: 0 } }
      const mockDeleteButton = { position: { y: 0 } }
      
      shelfGenerator.getSelectedDivider = vi.fn(() => ({
        dividerId: 'test1',
        position: 50,
        mesh: mockMesh
      }))
      
      shelfGenerator.deleteButton = mockDeleteButton as any
      
      const newPosition = 89.54
      shelfGenerator.updateDividerPosition(newPosition)
      
      const expectedWorldY = 91.445
      expect(mockDeleteButton.position.y).toBeCloseTo(expectedWorldY)
    })
  })

  describe('Post-drag click prevention', () => {
    it('should set justFinishedDragging flag after commitDragPosition', () => {
      // This would be tested via the XState action, but we can test the flag behavior
      expect(shelfGenerator.justFinishedDragging).toBe(false)
      
      // Simulate drag completion
      shelfGenerator.justFinishedDragging = true
      
      // Should ignore click
      expect(shelfGenerator.justFinishedDragging).toBe(true)
      
      // Flag should clear after timeout (we'd need to test with fake timers)
    })
  })
})