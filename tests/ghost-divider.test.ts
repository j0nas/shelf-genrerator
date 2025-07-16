/**
 * Ghost Divider Tests for XState Architecture
 * 
 * These tests verify that ghost dividers work correctly in our clean XState-based system.
 * They cover ghost divider lifecycle, positioning, and interaction with panels.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../dist/js/divider-state-machine.js';

// Test configuration
const testShelfConfig = {
    width: 91,
    height: 183,
    depth: 30,
    materialThickness: 1.8
};

// Helper functions
function createTestService() {
    const service = createDividerSystemService();
    service.start();
    
    service.send({
        type: 'UPDATE_SHELF_CONFIG',
        config: testShelfConfig
    });
    
    return service;
}

function getState(service: any) {
    return service.getSnapshot();
}

function getContext(service: any) {
    return getState(service).context;
}

describe('Ghost Divider Behavior Tests', () => {
    let service: any;

    beforeEach(() => {
        if (service) {
            service.stop();
            service = null;
        }
        service = createTestService();
    });

    afterEach(() => {
        if (service) {
            service.stop();
            service = null;
        }
    });

    describe('Ghost Divider Creation', () => {
        it('should create horizontal ghost divider on mouse movement', () => {
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91, // Center of 183cm height
                positionX: 0   // Center of width
            });
            
            const context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.type).toBe('horizontal');
            expect(context.ghostDivider.canAdd).toBe(true);
            expect(context.ghostDivider.visible).toBe(true);
        });

        it('should create vertical ghost divider near edges', () => {
            service.send({
                type: 'MOUSE_MOVE',
                x: 200,
                y: 100,
                positionY: 91,
                positionX: -35 // Near left edge - adjusted for 91cm width
            });
            
            const context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.type).toBe('vertical');
            expect(context.ghostDivider.canAdd).toBe(true);
            expect(context.ghostDivider.visible).toBe(true);
        });

        it('should prioritize vertical ghost near edges', () => {
            // Mouse near right edge should show vertical ghost
            service.send({
                type: 'MOUSE_MOVE',
                x: 250,
                y: 100,
                positionY: 91,
                positionX: 35 // Near right edge - adjusted for 91cm width
            });
            
            const context = getContext(service);
            expect(context.ghostDivider.type).toBe('vertical');
        });
    });

    describe('Ghost Divider Hiding', () => {
        it('should hide ghost divider when hovering over panels', () => {
            // First create a ghost divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0
            });
            
            let context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            
            // Mouse over panel should hide ghost
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0,
                isOverPanel: true
            });
            
            context = getContext(service);
            expect(context.ghostDivider).toBeNull();
        });

        it('should hide ghost divider when hovering over existing dividers', () => {
            // Add a divider first
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 91,
                positionX: 0
            });
            
            const divider = getContext(service).horizontalDividers[0];
            
            // Hover over the divider
            service.send({
                type: 'HOVER_DIVIDER',
                divider: divider
            });
            
            const state = getState(service);
            expect(state.value).toBe('hovering');
            expect(getContext(service).ghostDivider).toBeNull();
        });

        it('should hide ghost divider when divider is selected', () => {
            // Add and select a divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 91,
                positionX: 0
            });
            
            const divider = getContext(service).horizontalDividers[0];
            
            service.send({
                type: 'CLICK_DIVIDER',
                divider: divider
            });
            
            const state = getState(service);
            expect(state.value).toBe('selected');
            expect(getContext(service).ghostDivider).toBeNull();
        });
    });

    describe('Ghost Divider Reappearance', () => {
        it('should show ghost divider again when moving off panels', () => {
            // Create ghost, then hide with panel
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0
            });
            
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0,
                isOverPanel: true
            });
            
            expect(getContext(service).ghostDivider).toBeNull();
            
            // Move off panel
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0,
                isOverPanel: false
            });
            
            const context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.visible).toBe(true);
        });

        it('should show ghost divider when returning to normal state', () => {
            // Add and select divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 91,
                positionX: 0
            });
            
            const divider = getContext(service).horizontalDividers[0];
            
            service.send({
                type: 'CLICK_DIVIDER',
                divider: divider
            });
            
            expect(getContext(service).ghostDivider).toBeNull();
            
            // Deselect
            service.send({
                type: 'CLICK_ELSEWHERE'
            });
            
            // Move mouse to trigger ghost
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 120,
                positionY: 127, // ~50" converted to cm
                positionX: 0
            });
            
            const context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.visible).toBe(true);
        });
    });

    describe('Ghost Divider Positioning Logic', () => {
        it('should calculate correct position for horizontal dividers', () => {
            const mouseY = 36; // Middle of 72" shelf
            
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: mouseY,
                positionX: 0
            });
            
            const context = getContext(service);
            expect(context.ghostDivider.position).toBeCloseTo(mouseY);
        });

        it('should calculate correct position for vertical dividers', () => {
            const mouseX = -35; // Left side - adjusted for 91cm width
            
            service.send({
                type: 'MOUSE_MOVE',
                x: 50,
                y: 100,
                positionY: 91,
                positionX: mouseX
            });
            
            const context = getContext(service);
            expect(context.ghostDivider.type).toBe('vertical');
            expect(context.ghostDivider.positionX).toBeCloseTo(mouseX);
        });

        it('should handle edge cases near boundaries', () => {
            const config = testShelfConfig;
            const interiorHeight = config.height - (2 * config.materialThickness);
            
            // Test near top boundary
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 10,
                positionY: interiorHeight - 1, // Near top
                positionX: 0
            });
            
            let context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.canAdd).toBe(true);
            
            // Test near bottom boundary
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 200,
                positionY: 3, // Near bottom - adjusted for metric
                positionX: 0
            });
            
            context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.canAdd).toBe(true);
        });
    });

    describe('Collision Detection', () => {
        it('should prevent ghost divider where collision would occur', () => {
            // Add a divider first
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 91,
                positionX: 0
            });
            
            // Try to create ghost very close to existing divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 101,
                positionY: 91.5, // Very close to existing divider at 91
                positionX: 0
            });
            
            const context = getContext(service);
            if (context.ghostDivider) {
                expect(context.ghostDivider.canAdd).toBe(false);
            }
        });

        it('should allow ghost divider with sufficient spacing', () => {
            // Add a divider first
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 100,
                positionY: 91,
                positionX: 0
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 91,
                positionX: 0
            });
            
            // Create ghost with sufficient distance
            service.send({
                type: 'MOUSE_MOVE',
                x: 100,
                y: 120,
                positionY: 127, // ~50" converted to cm // 14" away from existing divider
                positionX: 0
            });
            
            const context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.canAdd).toBe(true);
        });
    });

    describe('Multiple Divider Scenarios', () => {
        it('should work correctly with multiple existing dividers', () => {
            // Add first divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 61, positionX: 0 // ~24" in cm
            });
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 61, positionX: 0 // ~24" in cm
            });
            
            // Add second divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 120,
                positionY: 122, positionX: 0 // ~48" in cm
            });
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 122, positionX: 0 // ~48" in cm
            });
            
            expect(getContext(service).horizontalDividers.length).toBe(2);
            
            // Test ghost between dividers
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 110,
                positionY: 91, // Between 24 and 48
                positionX: 0
            });
            
            const context = getContext(service);
            expect(context.ghostDivider).not.toBeNull();
            expect(context.ghostDivider.canAdd).toBe(true);
        });

        it('should handle mix of horizontal and vertical dividers', () => {
            // Add horizontal divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 91, positionX: 0
            });
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 91, positionX: 0
            });
            
            // Add vertical divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 50, y: 100,
                positionY: 91, positionX: -35
            });
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 91, positionX: -35
            });
            
            const context = getContext(service);
            expect(context.horizontalDividers.length).toBe(1);
            expect(context.verticalDividers.length).toBe(1);
            
            // Test ghost in area with both types
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 120,
                positionY: 127, // ~50" converted to cm positionX: 0
            });
            
            const updatedContext = getContext(service);
            expect(updatedContext.ghostDivider).not.toBeNull();
            expect(updatedContext.ghostDivider.type).toBe('horizontal');
        });
    });
});