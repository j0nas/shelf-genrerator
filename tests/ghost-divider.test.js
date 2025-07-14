/**
 * Comprehensive Ghost Divider Tests
 * 
 * These tests prevent the subdivision ghost bug from ever happening again.
 * They cover ghost divider lifecycle, unit conversions, section detection,
 * and the specific subdivision scenario that was broken.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ShelfGenerator } from '../js/shelf-generator.js';
import { App } from '../js/main.js';

// Mock DOM elements needed for the app
global.document = {
    getElementById: (id) => {
        const mockElements = {
            'width': { value: '36' },
            'height': { value: '72' }, 
            'depth': { value: '12' },
            'units': { value: 'imperial' },
            'materialType': { value: 'plywood' },
            'materialThickness': { value: '0.75' }
        };
        return mockElements[id] || { value: '' };
    },
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext: () => ({
                    fillStyle: '',
                    fillRect: () => {},
                    strokeStyle: '',
                    lineWidth: 0,
                    strokeRect: () => {},
                    font: '',
                    textAlign: '',
                    textBaseline: '',
                    fillText: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    stroke: () => {},
                    ellipse: () => {},
                    fill: () => {},
                    clearRect: () => {},
                    shadowColor: '',
                    shadowBlur: 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    lineCap: ''
                })
            };
        }
        return {
            clientWidth: 800,
            clientHeight: 600,
            appendChild: () => {},
            addEventListener: () => {},
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
        };
    }
};

global.window = {
    addEventListener: () => {},
    app: null,
    shelfGenerator: null
};

describe('Ghost Divider Lifecycle Tests', () => {
    let app, shelfGenerator;
    
    beforeEach(() => {
        // Create a fresh app instance for each test
        app = new App();
        global.window.app = app;
        
        shelfGenerator = app.shelfGenerator;
        global.window.shelfGenerator = shelfGenerator;
    });
    
    afterEach(() => {
        // Clean up after each test
        if (shelfGenerator) {
            shelfGenerator.cleanupInteractionState();
        }
        global.window.app = null;
        global.window.shelfGenerator = null;
    });
    
    describe('Ghost Divider Creation and Cleanup', () => {
        it('should create ghost divider when needed', () => {
            expect(shelfGenerator.ghostDivider).toBe(null);
            
            shelfGenerator.createGhostDivider();
            
            expect(shelfGenerator.ghostDivider).not.toBe(null);
            expect(shelfGenerator.ghostDivider).toBeInstanceOf(THREE.Mesh);
            expect(shelfGenerator.ghostDivider.visible).toBe(false);
            expect(shelfGenerator.ghostDivider.material.color.getHex()).toBe(0x00ff00);
            expect(shelfGenerator.ghostDivider.material.transparent).toBe(true);
            expect(shelfGenerator.ghostDivider.material.opacity).toBe(0.5);
        });
        
        it('should add ghost divider to shelfGroup', () => {
            shelfGenerator.createGhostDivider();
            
            expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
        });
        
        it('should hide ghost divider without disposing it', () => {
            shelfGenerator.createGhostDivider();
            shelfGenerator.ghostDivider.visible = true;
            
            shelfGenerator.hideGhostDivider();
            
            expect(shelfGenerator.ghostDivider.visible).toBe(false);
            expect(shelfGenerator.ghostDivider).not.toBe(null); // Still exists
        });
        
        it('should completely clean up ghost divider', () => {
            shelfGenerator.createGhostDivider();
            const geometry = shelfGenerator.ghostDivider.geometry;
            const material = shelfGenerator.ghostDivider.material;
            
            // Mock dispose methods
            geometry.dispose = vi.fn();
            material.dispose = vi.fn();
            
            shelfGenerator.cleanupGhostDivider();
            
            expect(shelfGenerator.ghostDivider).toBe(null);
            expect(geometry.dispose).toHaveBeenCalled();
            expect(material.dispose).toHaveBeenCalled();
        });
        
        it('should clean up ghost divider during shelf update', () => {
            shelfGenerator.createGhostDivider();
            const originalGhost = shelfGenerator.ghostDivider;
            
            // Simulate shelf update
            app.generateShelf();
            
            expect(shelfGenerator.ghostDivider).toBe(null);
            expect(shelfGenerator.shelfGroup.children).not.toContain(originalGhost);
        });
    });
    
    describe('Ghost Divider Positioning', () => {
        beforeEach(() => {
            // Set up a basic shelf configuration
            app.currentConfig = {
                width: 36,
                height: 72,
                depth: 12,
                materialThickness: 0.75,
                units: 'imperial',
                shelfLayout: []
            };
            app.generateShelf();
        });
        
        it('should position ghost divider correctly in imperial mode', () => {
            const sectionInfo = {
                centerPosition: 36, // 36 inches from bottom
                canAdd: true,
                sectionIndex: 0
            };
            
            shelfGenerator.updateGhostDivider(sectionInfo);
            
            expect(shelfGenerator.ghostDivider).not.toBe(null);
            expect(shelfGenerator.ghostDivider.visible).toBe(true);
            
            // Check position calculation
            const expectedWorldY = shelfGenerator.shelfToWorldPosition(36, app.currentConfig);
            expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedWorldY);
        });
        
        it('should position ghost divider correctly in metric mode', () => {
            app.currentConfig.units = 'metric';
            app.currentConfig.width = 91.44; // 36" in cm
            app.currentConfig.height = 182.88; // 72" in cm  
            app.currentConfig.depth = 30.48; // 12" in cm
            app.currentConfig.materialThickness = 1.905; // 0.75" in cm
            
            const sectionInfo = {
                centerPosition: 91.44, // 91.44 cm from bottom
                canAdd: true,
                sectionIndex: 0
            };
            
            shelfGenerator.updateGhostDivider(sectionInfo);
            
            expect(shelfGenerator.ghostDivider).not.toBe(null);
            expect(shelfGenerator.ghostDivider.visible).toBe(true);
            
            // Check position calculation - should NOT convert units
            const expectedWorldY = shelfGenerator.shelfToWorldPosition(91.44, app.currentConfig);
            expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedWorldY);
        });
        
        it('should hide ghost divider when section cannot add', () => {
            const sectionInfo = {
                centerPosition: 36,
                canAdd: false, // Cannot add divider
                sectionIndex: 0
            };
            
            shelfGenerator.createGhostDivider();
            shelfGenerator.ghostDivider.visible = true;
            
            shelfGenerator.updateGhostDivider(sectionInfo);
            
            expect(shelfGenerator.ghostDivider.visible).toBe(false);
        });
        
        it('should hide ghost divider when no section info', () => {
            shelfGenerator.createGhostDivider();
            shelfGenerator.ghostDivider.visible = true;
            
            shelfGenerator.updateGhostDivider(null);
            
            expect(shelfGenerator.ghostDivider.visible).toBe(false);
        });
    });
});

describe('Unit Conversion Tests', () => {
    let shelfGenerator;
    
    beforeEach(() => {
        const app = new App();
        global.window.app = app;
        shelfGenerator = app.shelfGenerator;
    });
    
    it('should not convert units in shelfToWorldPosition for imperial', () => {
        const config = {
            units: 'imperial',
            materialThickness: 0.75
        };
        shelfGenerator.currentConfig = config;
        shelfGenerator.shelfGroup = { position: { y: 0 } };
        
        const result = shelfGenerator.shelfToWorldPosition(36, config);
        
        // Should be thickness + input value (no conversion)
        expect(result).toBeCloseTo(0.75 + 36);
    });
    
    it('should not convert units in shelfToWorldPosition for metric', () => {
        const config = {
            units: 'metric',
            materialThickness: 1.905 // 0.75" in cm
        };
        shelfGenerator.currentConfig = config;
        shelfGenerator.shelfGroup = { position: { y: 0 } };
        
        const result = shelfGenerator.shelfToWorldPosition(91.44, config); // 36" in cm
        
        // Should be thickness + input value (NO conversion to inches)
        expect(result).toBeCloseTo(1.905 + 91.44);
        
        // Should NOT be divided by 2.54
        expect(result).not.toBeCloseTo(1.905 + (91.44 / 2.54));
    });
    
    it('should handle shelf group positioning offset', () => {
        const config = {
            units: 'imperial',
            materialThickness: 0.75
        };
        shelfGenerator.currentConfig = config;
        shelfGenerator.shelfGroup = { position: { y: 10 } }; // Offset by 10 units
        
        const result = shelfGenerator.shelfToWorldPosition(36, config);
        
        expect(result).toBeCloseTo(10 + 0.75 + 36);
    });
});

describe('Section Detection Tests', () => {
    let app, shelfGenerator;
    
    beforeEach(() => {
        app = new App();
        global.window.app = app;
        shelfGenerator = app.shelfGenerator;
        
        // Set up basic config
        app.currentConfig = {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            units: 'imperial',
            shelfLayout: []
        };
        app.generateShelf();
    });
    
    it('should detect empty shelf section', () => {
        app.currentConfig.shelfLayout = [];
        
        const result = shelfGenerator.detectHoveredSection(36); // Middle of shelf
        
        expect(result).not.toBe(null);
        expect(result.sectionIndex).toBe(0);
        expect(result.canAdd).toBe(true);
        expect(result.centerPosition).toBeCloseTo(app.getInteriorHeight() / 2);
        expect(result.sectionBounds.bottom).toBe(0);
        expect(result.sectionBounds.top).toBe(app.getInteriorHeight());
    });
    
    it('should detect bottom section after placing one divider', () => {
        // Add a divider at middle
        const middlePos = app.getInteriorHeight() / 2;
        app.currentConfig.shelfLayout = [
            { id: 'div1', position: middlePos, spaces: { above: {}, below: {} } }
        ];
        
        // Test bottom section (below the divider)
        const testPos = middlePos * 0.5; // Middle of bottom section
        const result = shelfGenerator.detectHoveredSection(testPos);
        
        expect(result).not.toBe(null);
        expect(result.sectionIndex).toBe(0);
        expect(result.canAdd).toBe(true);
        expect(result.sectionBounds.bottom).toBe(0);
        expect(result.sectionBounds.top).toBe(middlePos);
        expect(result.centerPosition).toBeCloseTo(middlePos / 2);
    });
    
    it('should detect top section after placing one divider', () => {
        // Add a divider at middle
        const interiorHeight = app.getInteriorHeight();
        const middlePos = interiorHeight / 2;
        app.currentConfig.shelfLayout = [
            { id: 'div1', position: middlePos, spaces: { above: {}, below: {} } }
        ];
        
        // Test top section (above the divider)
        const testPos = middlePos + (interiorHeight - middlePos) * 0.5; // Middle of top section
        const result = shelfGenerator.detectHoveredSection(testPos);
        
        expect(result).not.toBe(null);
        expect(result.sectionIndex).toBe(1);
        expect(result.canAdd).toBe(true);
        expect(result.sectionBounds.bottom).toBe(middlePos);
        expect(result.sectionBounds.top).toBe(interiorHeight);
        expect(result.centerPosition).toBeCloseTo(middlePos + (interiorHeight - middlePos) / 2);
    });
    
    it('should reject sections that are too small', () => {
        // Add dividers very close together
        app.currentConfig.shelfLayout = [
            { id: 'div1', position: 10, spaces: { above: {}, below: {} } },
            { id: 'div2', position: 12, spaces: { above: {}, below: {} } } // Only 2" apart
        ];
        
        // Test the tiny section between dividers
        const result = shelfGenerator.detectHoveredSection(11);
        
        expect(result).not.toBe(null);
        expect(result.canAdd).toBe(false); // Too small to add another divider
        expect(result.sectionHeight).toBeCloseTo(2);
    });
    
    it('should handle metric minimum section heights', () => {
        app.currentConfig.units = 'metric';
        app.currentConfig.shelfLayout = [
            { id: 'div1', position: 25, spaces: { above: {}, below: {} } },
            { id: 'div2', position: 30, spaces: { above: {}, below: {} } } // Only 5cm apart
        ];
        
        // Test the tiny section between dividers
        const result = shelfGenerator.detectHoveredSection(27.5);
        
        expect(result).not.toBe(null);
        expect(result.canAdd).toBe(false); // 5cm < 20cm minimum (10cm * 2)
        expect(result.sectionHeight).toBeCloseTo(5);
    });
    
    it('should return null for positions outside shelf bounds', () => {
        const interiorHeight = app.getInteriorHeight();
        
        expect(shelfGenerator.detectHoveredSection(-1)).toBe(null);
        expect(shelfGenerator.detectHoveredSection(interiorHeight + 1)).toBe(null);
    });
});

describe('Subdivision Ghost Bug Prevention Tests', () => {
    let app, shelfGenerator;
    
    beforeEach(() => {
        app = new App();
        global.window.app = app;
        shelfGenerator = app.shelfGenerator;
        
        // Set up the exact scenario that was broken
        app.currentConfig = {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            units: 'imperial',
            shelfLayout: []
        };
        app.generateShelf();
    });
    
    it('should show ghost dividers in subdivided sections after adding first divider', () => {
        // Step 1: Start with empty shelf
        expect(shelfGenerator.ghostDivider).toBe(null);
        
        // Step 2: Add first divider at middle
        const middlePos = app.getInteriorHeight() / 2;
        app.addDividerAtPosition(middlePos);
        
        // Verify divider was added
        expect(app.currentConfig.shelfLayout.length).toBe(1);
        expect(app.currentConfig.shelfLayout[0].position).toBeCloseTo(middlePos);
        
        // Step 3: Test ghost in bottom section (the "red area")
        const bottomSectionTest = middlePos * 0.5;
        const bottomSectionInfo = shelfGenerator.detectHoveredSection(bottomSectionTest);
        
        expect(bottomSectionInfo).not.toBe(null);
        expect(bottomSectionInfo.sectionIndex).toBe(0);
        expect(bottomSectionInfo.canAdd).toBe(true);
        
        shelfGenerator.updateGhostDivider(bottomSectionInfo);
        
        expect(shelfGenerator.ghostDivider).not.toBe(null);
        expect(shelfGenerator.ghostDivider.visible).toBe(true);
        expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
        
        // Step 4: Test ghost in top section (the "blue area")
        const topSectionTest = middlePos + (app.getInteriorHeight() - middlePos) * 0.5;
        const topSectionInfo = shelfGenerator.detectHoveredSection(topSectionTest);
        
        expect(topSectionInfo).not.toBe(null);
        expect(topSectionInfo.sectionIndex).toBe(1);
        expect(topSectionInfo.canAdd).toBe(true);
        
        shelfGenerator.updateGhostDivider(topSectionInfo);
        
        expect(shelfGenerator.ghostDivider).not.toBe(null);
        expect(shelfGenerator.ghostDivider.visible).toBe(true);
        expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
    });
    
    it('should maintain ghost divider after multiple shelf updates', () => {
        // Add a divider
        const middlePos = app.getInteriorHeight() / 2;
        app.addDividerAtPosition(middlePos);
        
        // Force multiple shelf updates (this was causing the bug)
        app.generateShelf();
        app.generateShelf();
        app.generateShelf();
        
        // Test that ghost still works in subdivided sections
        const bottomSectionTest = middlePos * 0.5;
        const sectionInfo = shelfGenerator.detectHoveredSection(bottomSectionTest);
        
        shelfGenerator.updateGhostDivider(sectionInfo);
        
        expect(shelfGenerator.ghostDivider).not.toBe(null);
        expect(shelfGenerator.ghostDivider.visible).toBe(true);
        expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
        
        // Verify it's not a disposed object
        expect(shelfGenerator.ghostDivider.geometry).toBeDefined();
        expect(shelfGenerator.ghostDivider.material).toBeDefined();
    });
    
    it('should work correctly in metric mode subdivisions', () => {
        // Switch to metric
        app.currentConfig.units = 'metric';
        app.currentConfig.width = 91.44; // 36" in cm
        app.currentConfig.height = 182.88; // 72" in cm  
        app.currentConfig.depth = 30.48; // 12" in cm
        app.currentConfig.materialThickness = 1.905; // 0.75" in cm
        app.generateShelf();
        
        // Add divider at middle
        const middlePos = app.getInteriorHeight() / 2;
        app.addDividerAtPosition(middlePos);
        
        // Test ghost in bottom section
        const bottomSectionTest = middlePos * 0.5;
        const sectionInfo = shelfGenerator.detectHoveredSection(bottomSectionTest);
        
        shelfGenerator.updateGhostDivider(sectionInfo);
        
        expect(shelfGenerator.ghostDivider).not.toBe(null);
        expect(shelfGenerator.ghostDivider.visible).toBe(true);
        
        // Verify position calculation is correct (no unit conversion issues)
        const expectedY = shelfGenerator.shelfToWorldPosition(sectionInfo.centerPosition, app.currentConfig);
        expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedY);
    });
    
    it('should handle rapid mouse movements over subdivided sections', () => {
        // Add a divider
        const middlePos = app.getInteriorHeight() / 2;
        app.addDividerAtPosition(middlePos);
        
        // Simulate rapid mouse movements between sections
        const positions = [
            middlePos * 0.25,  // Bottom section
            middlePos * 0.75,  // Still bottom section
            middlePos + 5,     // Top section  
            middlePos + 10,    // Still top section
            middlePos * 0.5,   // Back to bottom section
        ];
        
        positions.forEach(pos => {
            const sectionInfo = shelfGenerator.detectHoveredSection(pos);
            shelfGenerator.updateGhostDivider(sectionInfo);
            
            if (sectionInfo && sectionInfo.canAdd) {
                expect(shelfGenerator.ghostDivider).not.toBe(null);
                expect(shelfGenerator.ghostDivider.visible).toBe(true);
                expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
            }
        });
    });
    
    it('should clean up properly when switching between states', () => {
        // Add a divider and show ghost
        const middlePos = app.getInteriorHeight() / 2;
        app.addDividerAtPosition(middlePos);
        
        const sectionInfo = shelfGenerator.detectHoveredSection(middlePos * 0.5);
        shelfGenerator.updateGhostDivider(sectionInfo);
        
        expect(shelfGenerator.ghostDivider.visible).toBe(true);
        
        // Clean up interaction state (simulates what happens during shelf updates)
        shelfGenerator.cleanupInteractionState();
        
        expect(shelfGenerator.ghostDivider).toBe(null);
        
        // Verify ghost works again after cleanup
        const newSectionInfo = shelfGenerator.detectHoveredSection(middlePos * 0.5);
        shelfGenerator.updateGhostDivider(newSectionInfo);
        
        expect(shelfGenerator.ghostDivider).not.toBe(null);
        expect(shelfGenerator.ghostDivider.visible).toBe(true);
    });
});