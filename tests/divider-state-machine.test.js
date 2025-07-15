import { describe, it, expect, beforeEach } from 'vitest';
import { dividerStateMachine, createDividerSystemService } from '../dist/js/divider-state-machine.js';

// Test configuration
const testShelfConfig = {
    width: 36,
    height: 72,
    depth: 12,
    materialThickness: 0.75,
    units: 'imperial'
};

// Helper functions for testing
function createTestService() {
    const service = createDividerSystemService();
    service.start();
    
    // Set up test configuration
    service.send({
        type: 'UPDATE_SHELF_CONFIG',
        config: testShelfConfig
    });
    
    return service;
}

function getState(service) {
    return service.getSnapshot();
}

function getContext(service) {
    return getState(service).context;
}

function assertDividerCount(service, horizontal, vertical, message) {
    const context = getContext(service);
    expect(context.horizontalDividers.length).toBe(horizontal);
    expect(context.verticalDividers.length).toBe(vertical);
}

describe('Divider State Machine', () => {
    let service;

    beforeEach(() => {
        service = createTestService();
    });

    it('should start in the correct initial state', () => {
        const state = getState(service);
        const context = getContext(service);
        
        expect(state.value).toBe('normal');
        expect(context.horizontalDividers.length).toBe(0);
        expect(context.verticalDividers.length).toBe(0);
        expect(context.selectedDivider).toBeNull();
        expect(context.hoveredDivider).toBeNull();
        expect(context.ghostDivider).toBeNull();
        expect(context.isDragging).toBe(false);
    });

    it('should update shelf configuration', () => {
        const newConfig = {
            width: 48,
            height: 96,
            depth: 16,
            materialThickness: 1.0,
            units: 'metric'
        };
        
        service.send({
            type: 'UPDATE_SHELF_CONFIG',
            config: newConfig
        });
        
        const context = getContext(service);
        expect(context.shelfConfig.width).toBe(48);
        expect(context.shelfConfig.height).toBe(96);
        expect(context.shelfConfig.units).toBe('metric');
    });

    it('should create ghost dividers on mouse movement', () => {
        // Test mouse movement in center (should create horizontal ghost)
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36, // Center of 72" height
            positionX: 0   // Center of width
        });
        
        const context = getContext(service);
        expect(context.ghostDivider).not.toBeNull();
        expect(context.ghostDivider.type).toBe('horizontal');
        expect(context.ghostDivider.canAdd).toBe(true);
        expect(context.ghostDivider.visible).toBe(true);
    });

    it('should create vertical ghost dividers near edges', () => {
        // Test mouse movement near edge (should create vertical ghost)
        service.send({
            type: 'MOUSE_MOVE',
            x: 200,
            y: 100,
            positionY: 36,
            positionX: -15 // Near left edge
        });
        
        const context = getContext(service);
        expect(context.ghostDivider.type).toBe('vertical');
        expect(context.ghostDivider.canAdd).toBe(true);
    });

    it('should add horizontal dividers correctly', () => {
        // Set up mouse position for horizontal divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0
        });
        
        // Add horizontal divider
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36,
            positionX: 0
        });
        
        assertDividerCount(service, 1, 0, 'After adding horizontal divider');
        
        const context = getContext(service);
        const divider = context.horizontalDividers[0];
        expect(divider.type).toBe('horizontal');
        expect(divider.id).toBeDefined();
        expect(divider.position).toBeGreaterThan(0);
    });

    it('should add vertical dividers correctly', () => {
        // Set up mouse position for vertical divider (near left edge)
        service.send({
            type: 'MOUSE_MOVE',
            x: 50,
            y: 100,
            positionY: 36,
            positionX: -15
        });
        
        // Add vertical divider
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36,
            positionX: -15
        });
        
        assertDividerCount(service, 0, 1, 'After adding vertical divider');
        
        const context = getContext(service);
        const divider = context.verticalDividers[0];
        expect(divider.type).toBe('vertical');
        expect(divider.id).toBeDefined();
        expect(divider.position).toBeLessThan(0); // Left side should be negative
    });

    it('should handle divider selection', () => {
        // Add a horizontal divider first
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36,
            positionX: 0
        });
        
        const context = getContext(service);
        const divider = context.horizontalDividers[0];
        
        // Select the divider
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        const state = getState(service);
        expect(state.value).toBe('selected');
        expect(getContext(service).selectedDivider.id).toBe(divider.id);
        expect(getContext(service).ghostDivider).toBeNull();
    });

    it('should handle divider dragging', () => {
        // Add and select a horizontal divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36,
            positionX: 0
        });
        
        const divider = getContext(service).horizontalDividers[0];
        const originalPosition = divider.position;
        
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        // Start drag
        service.send({
            type: 'MOUSE_DOWN',
            x: 100,
            y: 100
        });
        
        expect(getState(service).value).toBe('preparingDrag');
        
        // Move mouse to trigger drag
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 120,
            positionY: 40,
            positionX: 0
        });
        
        const state = getState(service);
        expect(state.value).toBe('dragging');
        expect(getContext(service).isDragging).toBe(true);
        
        // Verify position updated during drag
        const draggedDivider = getContext(service).horizontalDividers[0];
        expect(draggedDivider.position).not.toBe(originalPosition);
        
        // End drag
        service.send({
            type: 'MOUSE_UP'
        });
        
        expect(getState(service).value).toBe('selected');
        expect(getContext(service).isDragging).toBe(false);
    });

    it('should handle divider deletion', () => {
        // Add two dividers
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36,
            positionX: 0
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 80,
            positionY: 18,
            positionX: 0
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 18,
            positionX: 0
        });
        
        assertDividerCount(service, 2, 0, 'After adding two dividers');
        
        // Select and delete first divider
        const divider = getContext(service).horizontalDividers[0];
        
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        service.send({
            type: 'CLICK_DELETE'
        });
        
        const state = getState(service);
        expect(state.value).toBe('normal');
        assertDividerCount(service, 1, 0, 'After deleting one divider');
        expect(getContext(service).selectedDivider).toBeNull();
    });

    it('should enforce constraints during dragging', () => {
        // Add a divider at the top
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 20,
            positionY: 68, // Near top (72" - 4")
            positionX: 0
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 68,
            positionX: 0
        });
        
        const divider = getContext(service).horizontalDividers[0];
        
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        service.send({
            type: 'MOUSE_DOWN',
            x: 100,
            y: 20
        });
        
        // Try to drag beyond top boundary
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 10,
            positionY: 80, // Beyond shelf height
            positionX: 0
        });
        
        const constrainedDivider = getContext(service).horizontalDividers[0];
        const interiorHeight = testShelfConfig.height - (2 * testShelfConfig.materialThickness);
        
        expect(constrainedDivider.position).toBeLessThan(interiorHeight);
        expect(constrainedDivider.position).toBeGreaterThan(0);
    });

    it('should handle system reset', () => {
        // Add some dividers
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36,
            positionX: 0
        });
        
        // Select a divider
        const divider = getContext(service).horizontalDividers[0];
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        // Reset system
        service.send({
            type: 'RESET'
        });
        
        const state = getState(service);
        const context = getContext(service);
        
        expect(state.value).toBe('normal');
        assertDividerCount(service, 0, 0, 'Should clear all dividers on reset');
        expect(context.selectedDivider).toBeNull();
        expect(context.hoveredDivider).toBeNull();
    });

    it('should transition through all states correctly', () => {
        // Test full state transition cycle
        expect(getState(service).value).toBe('normal');
        
        // Add divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36,
            positionX: 0
        });
        
        // Test hover → selected transition
        const divider = getContext(service).horizontalDividers[0];
        
        service.send({
            type: 'HOVER_DIVIDER',
            divider: divider
        });
        
        expect(getState(service).value).toBe('hovering');
        
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        expect(getState(service).value).toBe('selected');
        
        // Test drag cycle
        service.send({
            type: 'MOUSE_DOWN',
            x: 100,
            y: 100
        });
        
        expect(getState(service).value).toBe('preparingDrag');
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 120,
            positionY: 40,
            positionX: 0
        });
        
        expect(getState(service).value).toBe('dragging');
        
        service.send({
            type: 'MOUSE_UP'
        });
        
        expect(getState(service).value).toBe('selected');
        
        // Test return to normal
        service.send({
            type: 'CLICK_ELSEWHERE'
        });
        
        expect(getState(service).value).toBe('normal');
    });
});