import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShelfGenerator } from '../js/shelf-generator'

describe('Ghost Divider Positioning', () => {
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
    
    // Mock shelfGroup
    shelfGenerator.shelfGroup = {
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
      position: { x: 0, y: 0, z: 0, sub: vi.fn(), copy: vi.fn() }
    } as any
    
    // Mock scene
    shelfGenerator.scene = {
      add: vi.fn(),
      remove: vi.fn()
    } as any
  })

  describe('createGhostDivider', () => {
    it('should add ghost divider to shelfGroup not scene', () => {
      shelfGenerator.createGhostDivider()
      
      expect(shelfGenerator.shelfGroup.add).toHaveBeenCalled()
      expect(shelfGenerator.scene.add).not.toHaveBeenCalled()
    })

    it('should create ghost divider and add to shelfGroup', () => {
      shelfGenerator.createGhostDivider()
      
      expect(shelfGenerator.ghostDivider).toBeTruthy()
      expect(shelfGenerator.shelfGroup.add).toHaveBeenCalled()
    })
  })

  describe('updateGhostDivider', () => {
    beforeEach(() => {
      // Create a mock ghost divider
      shelfGenerator.ghostDivider = {
        position: { y: 0 },
        visible: false
      } as any
    })

    it('should position ghost at correct world coordinates', () => {
      const sectionInfo = {
        centerPosition: 89.54, // Center in app units (cm)
        canAdd: true,
        sectionIndex: 0,
        sectionBounds: { bottom: 0, top: 179.17 }
      }
      
      shelfGenerator.updateGhostDivider(sectionInfo)
      
      // Should call shelfToWorldPosition and set Y position
      const expectedWorldY = 89.54 + 1.905 // shelfY + thickness
      expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedWorldY)
      expect(shelfGenerator.ghostDivider.visible).toBe(true)
    })

    it('should hide ghost when section cannot add divider', () => {
      const sectionInfo = {
        centerPosition: 5,
        canAdd: false, // Too small
        sectionIndex: 0,
        sectionBounds: { bottom: 0, top: 10 }
      }
      
      shelfGenerator.updateGhostDivider(sectionInfo)
      
      expect(shelfGenerator.ghostDivider.visible).toBe(false)
    })

    it('should hide ghost when no section info provided', () => {
      shelfGenerator.updateGhostDivider(null)
      
      expect(shelfGenerator.ghostDivider.visible).toBe(false)
    })
  })

  describe('Ghost divider coordinate consistency', () => {
    it('should position ghost at same location as real divider would be placed', () => {
      // Mock the intersection result
      const mockResult = {
        position: 89.54, // Position where click would place divider
        units: 'metric',
        worldPoint: { x: 0, y: 91.445, z: 15 }
      }
      
      // Mock detectHoveredSection
      const mockSectionInfo = {
        centerPosition: 89.54,
        canAdd: true,
        sectionIndex: 0,
        sectionBounds: { bottom: 0, top: 179.17 }
      }
      
      shelfGenerator.detectHoveredSection = vi.fn(() => mockSectionInfo)
      shelfGenerator.createGhostDivider()
      
      // Update ghost position
      shelfGenerator.updateGhostDivider(mockSectionInfo)
      
      // Ghost should be at same Y as real divider would be
      const expectedWorldY = 91.445 // 89.54 + 1.905 thickness
      expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedWorldY)
      
      // Verify this matches what real divider positioning would be
      const realDividerY = shelfGenerator.shelfToWorldPosition(89.54, shelfGenerator.currentConfig)
      expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(realDividerY)
    })
  })
})