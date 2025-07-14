/**
 * Subdivision Ghost Bug Regression Test
 * 
 * This test specifically reproduces the exact bug scenario that was fixed:
 * "After placing the first horizontal divider, no more ghosts appear in subdivided sections"
 * 
 * If this test ever fails, the subdivision ghost bug has returned.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShelfGenerator } from '../js/shelf-generator.js';
import { App } from '../js/main.js';

// Set up minimal DOM environment
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
  createElement: () => ({
    clientWidth: 800,
    clientHeight: 600,
    appendChild: () => {},
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    getContext: () => ({
      fillStyle: '', fillRect: () => {}, strokeStyle: '', lineWidth: 0,
      strokeRect: () => {}, font: '', textAlign: '', textBaseline: '',
      fillText: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
      stroke: () => {}, ellipse: () => {}, fill: () => {}, clearRect: () => {},
      shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, lineCap: ''
    })
  })
};

global.window = { addEventListener: () => {} };

describe('Subdivision Ghost Bug Regression Test', () => {
  let app, shelfGenerator;
  
  beforeEach(() => {
    // Create fresh app instance
    app = new App();
    global.window.app = app;
    shelfGenerator = app.shelfGenerator;
    global.window.shelfGenerator = shelfGenerator;
    
    // Set up the exact configuration from the bug report
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
  
  it('BUG REPRODUCTION: subdivision ghosts should appear after placing first divider', () => {
    // === STEP 1: Verify empty shelf works ===
    console.log('🧪 Testing empty shelf ghost...');
    
    const emptySectionInfo = shelfGenerator.detectHoveredSection(36); // Middle of empty shelf
    expect(emptySectionInfo).not.toBe(null);
    expect(emptySectionInfo.canAdd).toBe(true);
    
    shelfGenerator.updateGhostDivider(emptySectionInfo);
    expect(shelfGenerator.ghostDivider).not.toBe(null);
    expect(shelfGenerator.ghostDivider.visible).toBe(true);
    
    console.log('✅ Empty shelf ghost works');
    
    // === STEP 2: Add first horizontal divider ===
    console.log('🧪 Adding first horizontal divider...');
    
    const middlePosition = app.getInteriorHeight() / 2; // Should be ~70.5" (72" - 1.5" for shelves)
    app.addDividerAtPosition(middlePosition);
    
    // Verify divider was added
    expect(app.currentConfig.shelfLayout.length).toBe(1);
    expect(app.currentConfig.shelfLayout[0].position).toBeCloseTo(middlePosition);
    
    console.log(`✅ Divider added at position ${middlePosition.toFixed(2)}"`);
    
    // === STEP 3: Test the "red area" (bottom section) ===
    console.log('🧪 Testing bottom section (red area)...');
    
    const bottomSectionTestPosition = middlePosition * 0.5; // Middle of bottom section
    const bottomSectionInfo = shelfGenerator.detectHoveredSection(bottomSectionTestPosition);
    
    // This should detect a valid section
    expect(bottomSectionInfo).not.toBe(null);
    expect(bottomSectionInfo.sectionIndex).toBe(0);
    expect(bottomSectionInfo.canAdd).toBe(true);
    expect(bottomSectionInfo.sectionBounds.bottom).toBe(0);
    expect(bottomSectionInfo.sectionBounds.top).toBeCloseTo(middlePosition);
    
    console.log(`✅ Bottom section detected: index=${bottomSectionInfo.sectionIndex}, canAdd=${bottomSectionInfo.canAdd}`);
    
    // === THE CRITICAL TEST: Ghost should appear in bottom section ===
    shelfGenerator.updateGhostDivider(bottomSectionInfo);
    
    expect(shelfGenerator.ghostDivider).not.toBe(null);
    expect(shelfGenerator.ghostDivider.visible).toBe(true);
    expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
    
    // Verify the ghost is positioned correctly
    const expectedWorldY = shelfGenerator.shelfToWorldPosition(bottomSectionInfo.centerPosition, app.currentConfig);
    expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedWorldY);
    
    console.log(`✅ Bottom section ghost appears at Y=${shelfGenerator.ghostDivider.position.y.toFixed(2)}`);
    
    // === STEP 4: Test the "blue area" (top section) ===
    console.log('🧪 Testing top section (blue area)...');
    
    const interiorHeight = app.getInteriorHeight();
    const topSectionTestPosition = middlePosition + (interiorHeight - middlePosition) * 0.5; // Middle of top section
    const topSectionInfo = shelfGenerator.detectHoveredSection(topSectionTestPosition);
    
    // This should detect a valid section
    expect(topSectionInfo).not.toBe(null);
    expect(topSectionInfo.sectionIndex).toBe(1);
    expect(topSectionInfo.canAdd).toBe(true);
    expect(topSectionInfo.sectionBounds.bottom).toBeCloseTo(middlePosition);
    expect(topSectionInfo.sectionBounds.top).toBeCloseTo(interiorHeight);
    
    console.log(`✅ Top section detected: index=${topSectionInfo.sectionIndex}, canAdd=${topSectionInfo.canAdd}`);
    
    // === THE CRITICAL TEST: Ghost should appear in top section ===
    shelfGenerator.updateGhostDivider(topSectionInfo);
    
    expect(shelfGenerator.ghostDivider).not.toBe(null);
    expect(shelfGenerator.ghostDivider.visible).toBe(true);
    expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
    
    // Verify the ghost is positioned correctly
    const expectedTopWorldY = shelfGenerator.shelfToWorldPosition(topSectionInfo.centerPosition, app.currentConfig);
    expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedTopWorldY);
    
    console.log(`✅ Top section ghost appears at Y=${shelfGenerator.ghostDivider.position.y.toFixed(2)}`);
    
    // === STEP 5: Test that ghost survives shelf updates ===
    console.log('🧪 Testing ghost persistence through shelf updates...');
    
    // Force a shelf regeneration (this was causing the bug)
    app.generateShelf();
    
    // Test bottom section again
    const newBottomSectionInfo = shelfGenerator.detectHoveredSection(bottomSectionTestPosition);
    shelfGenerator.updateGhostDivider(newBottomSectionInfo);
    
    expect(shelfGenerator.ghostDivider).not.toBe(null);
    expect(shelfGenerator.ghostDivider.visible).toBe(true);
    expect(shelfGenerator.shelfGroup.children).toContain(shelfGenerator.ghostDivider);
    
    console.log('✅ Ghost persists through shelf updates');
    
    console.log('🎉 SUBDIVISION GHOST BUG REGRESSION TEST PASSED');
  });
  
  it('BUG REPRODUCTION: metric mode subdivisions should work', () => {
    console.log('🧪 Testing metric mode subdivisions...');
    
    // Switch to metric mode
    app.currentConfig.units = 'metric';
    app.currentConfig.width = 91.44; // 36" in cm
    app.currentConfig.height = 182.88; // 72" in cm
    app.currentConfig.depth = 30.48; // 12" in cm
    app.currentConfig.materialThickness = 1.905; // 0.75" in cm
    app.generateShelf();
    
    // Add divider at middle
    const middlePosition = app.getInteriorHeight() / 2;
    app.addDividerAtPosition(middlePosition);
    
    console.log(`✅ Metric divider added at ${middlePosition.toFixed(2)}cm`);
    
    // Test bottom section
    const bottomSectionTest = middlePosition * 0.5;
    const sectionInfo = shelfGenerator.detectHoveredSection(bottomSectionTest);
    
    expect(sectionInfo).not.toBe(null);
    expect(sectionInfo.canAdd).toBe(true);
    
    shelfGenerator.updateGhostDivider(sectionInfo);
    
    expect(shelfGenerator.ghostDivider).not.toBe(null);
    expect(shelfGenerator.ghostDivider.visible).toBe(true);
    
    // Verify no unit conversion issues
    const expectedY = shelfGenerator.shelfToWorldPosition(sectionInfo.centerPosition, app.currentConfig);
    expect(shelfGenerator.ghostDivider.position.y).toBeCloseTo(expectedY);
    
    // The position should NOT be divided by 2.54 (this was the unit conversion bug)
    const incorrectY = shelfGenerator.shelfGroup.position.y + app.currentConfig.materialThickness + (sectionInfo.centerPosition / 2.54);
    expect(shelfGenerator.ghostDivider.position.y).not.toBeCloseTo(incorrectY);
    
    console.log('✅ Metric mode subdivision ghosts work correctly');
  });
  
  it('BUG REPRODUCTION: rapid mouse movements should not break ghosts', () => {
    console.log('🧪 Testing rapid mouse movements...');
    
    // Add divider
    const middlePosition = app.getInteriorHeight() / 2;
    app.addDividerAtPosition(middlePosition);
    
    // Simulate rapid mouse movements between sections
    const testPositions = [
      middlePosition * 0.25,  // Bottom section
      middlePosition * 0.75,  // Still bottom section
      middlePosition + 5,     // Top section
      middlePosition + 10,    // Still top section
      middlePosition * 0.5,   // Back to bottom section
      middlePosition + 2,     // Top section again
      middlePosition * 0.1,   // Bottom section again
    ];
    
    let successCount = 0;
    
    testPositions.forEach((pos, index) => {
      const sectionInfo = shelfGenerator.detectHoveredSection(pos);
      
      if (sectionInfo && sectionInfo.canAdd) {
        shelfGenerator.updateGhostDivider(sectionInfo);
        
        if (shelfGenerator.ghostDivider && shelfGenerator.ghostDivider.visible && 
            shelfGenerator.shelfGroup.children.includes(shelfGenerator.ghostDivider)) {
          successCount++;
        }
      }
    });
    
    expect(successCount).toBeGreaterThan(0);
    console.log(`✅ ${successCount}/${testPositions.length} rapid movements succeeded`);
  });
});

// Export for use in other test files
export { App, ShelfGenerator };