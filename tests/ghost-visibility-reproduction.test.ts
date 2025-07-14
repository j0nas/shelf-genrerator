import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShelfGenerator } from '../js/shelf-generator'

describe('Ghost Divider Visibility Reproduction Tests', () => {
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
      intersectObject: vi.fn(),
      intersectObjects: vi.fn(() => []) // Mock intersectObjects method
    } as any
    
    // Mock mouse
    shelfGenerator.mouse = { x: 0, y: 0 } as any
    
    // Mock camera
    shelfGenerator.camera = { position: { x: 0, y: 0, z: 10 } } as any
    
    // Mock renderer
    shelfGenerator.renderer = {
      domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) }
    } as any
    
    // Enable debug mode to see detailed logs
    shelfGenerator.debugMode = true
  })

  describe('Reproduce Imperial Bottom Half Issue', () => {
    beforeEach(() => {
      // Set up imperial configuration exactly as user experiences
      shelfGenerator.currentConfig = {
        width: 36,        // 36 inches
        height: 72,       // 72 inches  
        depth: 12,        // 12 inches
        materialThickness: 0.75, // 0.75 inches
        units: 'imperial'
      }
      
      window.app = {
        currentConfig: {
          ...shelfGenerator.currentConfig,
          shelfLayout: [] // Fresh shelf with no dividers
        },
        getInteriorHeight: () => 70.5, // 72 - 1.5
        toInches: (val) => val, // Already in inches
        fromInches: (val) => val // Already in inches
      }
    })

    it('reproduces imperial bottom half visibility (working case)', () => {
      // Simulate mouse move to bottom half of shelf
      const mockEvent = {
        clientX: 400, // center of 800px canvas
        clientY: 500  // near bottom (600px canvas, so 500 is in bottom area)
      }
      
      // Mock intersection in bottom half - simulating actual scene coordinates
      const worldPoint = { x: 0, y: 20, z: 6 } // 20" from bottom (bottom half of 72" shelf)
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      // Simulate the mouse move event
      shelfGenerator.onMouseMove(mockEvent)
      
      // Check that getShelfInteriorIntersection works
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(19.25) // 20 - 0.75 thickness
      
      // Check section detection
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
      
      console.log('Bottom half test passed - ghost should be visible')
    })

    it('reproduces imperial top half visibility (broken case)', () => {
      // Simulate mouse move to top half of shelf
      const mockEvent = {
        clientX: 400, // center of 800px canvas
        clientY: 100  // near top (600px canvas, so 100 is in top area)
      }
      
      // Mock intersection in top half - simulating actual scene coordinates
      const worldPoint = { x: 0, y: 50, z: 6 } // 50" from bottom (top half of 72" shelf)
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      // Simulate the mouse move event
      shelfGenerator.onMouseMove(mockEvent)
      
      // Check that getShelfInteriorIntersection works
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(49.25) // 50 - 0.75 thickness
      
      // Check section detection
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
      
      console.log('Top half test passed - both halves now work correctly!')
    })
  })

  describe('Reproduce Metric No Visibility Issue', () => {
    beforeEach(() => {
      // Set up metric configuration exactly as user experiences
      shelfGenerator.currentConfig = {
        width: 91.44,     // 36" in cm
        height: 182.88,   // 72" in cm
        depth: 30.48,     // 12" in cm
        materialThickness: 1.905, // 0.75" in cm
        units: 'metric'
      }
      
      window.app = {
        currentConfig: {
          ...shelfGenerator.currentConfig,
          shelfLayout: [] // Fresh shelf with no dividers
        },
        getInteriorHeight: () => 179.17, // 182.88 - 3.81
        toInches: (cm) => cm / 2.54,
        fromInches: (inches) => inches * 2.54
      }
    })

    it('reproduces metric visibility issue (should work but user reports no ghost)', () => {
      // Simulate mouse move anywhere on metric shelf
      const mockEvent = {
        clientX: 400, // center of 800px canvas
        clientY: 300  // middle of 600px canvas
      }
      
      // Mock intersection in middle of metric shelf
      const worldPoint = { x: 0, y: 91.44, z: 15 } // Middle of shelf in cm
      shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
        point: worldPoint
      }])
      
      // Simulate the mouse move event
      shelfGenerator.onMouseMove(mockEvent)
      
      // Check that getShelfInteriorIntersection works
      const result = shelfGenerator.getShelfInteriorIntersection()
      expect(result).toBeTruthy()
      expect(result.position).toBeCloseTo(89.535) // 91.44 - 1.905 thickness
      expect(result.units).toBe('metric')
      
      // Check section detection
      const sectionInfo = shelfGenerator.detectHoveredSection(result.position)
      expect(sectionInfo).toBeTruthy()
      expect(sectionInfo.canAdd).toBe(true)
      
      console.log('Metric test passed - both halves now work correctly!')
    })
  })

  describe('Check State Machine Impact on Ghost Visibility', () => {
    it('checks if state machine state affects ghost visibility logic', () => {
      // Setup imperial config
      shelfGenerator.currentConfig = {
        width: 36,
        height: 72,
        depth: 12,
        materialThickness: 0.75,
        units: 'imperial'
      }
      
      window.app = {
        currentConfig: { ...shelfGenerator.currentConfig, shelfLayout: [] },
        getInteriorHeight: () => 70.5,
        toInches: (val) => val,
        fromInches: (val) => val
      }
      
      // Test in different states
      const states = ['normal', 'hovering', 'selected', 'dragging', 'preparingDrag']
      
      states.forEach(targetState => {
        console.log(`Testing ghost visibility in ${targetState} state...`)
        
        // Force state (this is a test-only approach)
        if (targetState === 'selected') {
          // Simulate selecting a divider first
          const mockDivider = { dividerId: 'test-1', position: 30 }
          shelfGenerator.stateMachine.send({ 
            type: 'CLICK_DIVIDER', 
            divider: mockDivider 
          })
        }
        
        const currentState = shelfGenerator.getStateValue()
        console.log(`Current state: ${currentState}`)
        
        // Mock intersection
        const worldPoint = { x: 0, y: 20, z: 6 }
        shelfGenerator.raycaster.intersectObject = vi.fn(() => [{
          point: worldPoint
        }])
        
        const mockEvent = { clientX: 400, clientY: 500 }
        
        // This is the key test - does onMouseMove process ghost visibility in this state?
        shelfGenerator.onMouseMove(mockEvent)
        
        const result = shelfGenerator.getShelfInteriorIntersection()
        if (result) {
          console.log(`State ${targetState}: intersection detected`)
        } else {
          console.log(`State ${targetState}: NO intersection detected`)
        }
        
        // Reset state
        shelfGenerator.stateMachine.send({ type: 'CLICK_ELSEWHERE' })
      })
    })
  })
})