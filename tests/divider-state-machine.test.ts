import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../dist/js/divider-state-machine.js';

// Test configuration
const testShelfConfig = {
    width: 91,
    height: 183,
    depth: 30,
    materialThickness: 1.8
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

function getState(service: any) {
    return service.getSnapshot();
}

function getContext(service: any) {
    return getState(service).context;
}

function assertDividerCount(service: any, horizontal: number, vertical: number) {
    const context = getContext(service);
    expect(context.horizontalDividers.length).toBe(horizontal);
    expect(context.verticalDividers.length).toBe(vertical);
}

describe('Divider State Machine', () => {
    let service: any;

    beforeEach(() => {
        // Stop any existing service to ensure clean state
        if (service) {
            service.stop();
            service = null;
        }
        service = createTestService();
    });

    afterEach(() => {
        // Clean up after each test
        if (service) {
            service.stop();
            service = null;
        }
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
            width: 122,
            height: 244,
            depth: 41,
            materialThickness: 2.5
        };
        
        service.send({
            type: 'UPDATE_SHELF_CONFIG',
            config: newConfig
        });
        
        const context = getContext(service);
        expect(context.shelfConfig.width).toBe(122);
        expect(context.shelfConfig.height).toBe(244);
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

    it('should hide ghost dividers when hovering over panels', () => {
        // First create a ghost divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0
        });
        
        let context = getContext(service);
        expect(context.ghostDivider).not.toBeNull();
        
        // Test mouse movement over panel (should hide ghost)
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0,
            isOverPanel: true // Hovering over shelf panel
        });
        
        context = getContext(service);
        expect(context.ghostDivider).toBeNull();
        
        // Test that ghost reappears when moving off panel
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 36,
            positionX: 0,
            isOverPanel: false // Not over panel
        });
        
        context = getContext(service);
        expect(context.ghostDivider).not.toBeNull();
    });

    it('should create vertical ghost dividers near edges', () => {
        // Test mouse movement near edge (should create vertical ghost)
        // With 91cm width, interior width is ~87.4cm, so -35 is in the left edge zone
        service.send({
            type: 'MOUSE_MOVE',
            x: 200,
            y: 100,
            positionY: 91,
            positionX: -35 // Near left edge
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
        
        assertDividerCount(service, 1, 0);
        
        const context = getContext(service);
        const divider = context.horizontalDividers[0];
        expect(divider.type).toBe('horizontal');
        expect(divider.id).toBeDefined();
        expect(divider.position).toBeGreaterThan(0);
    });

    it('should add vertical dividers correctly', () => {
        // Set up mouse position for vertical divider (near left edge)
        // With 91cm width, interior width is ~87.4cm, so -35 is in the left edge zone
        service.send({
            type: 'MOUSE_MOVE',
            x: 50,
            y: 100,
            positionY: 91,
            positionX: -35
        });
        
        // Add vertical divider
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 91,
            positionX: -35
        });
        
        assertDividerCount(service, 0, 1);
        
        const context = getContext(service);
        const divider = context.verticalDividers[0];
        expect(divider.type).toBe('vertical');
        expect(divider.id).toBeDefined();
        expect(divider.position).toBe(-35); // Should match the input position
    });

    it('should handle divider selection from normal state', () => {
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

    it('should switch selection between dividers', () => {
        // Add two horizontal dividers
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36, positionX: 0
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 80,
            positionY: 18, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 18, positionX: 0
        });
        
        const context = getContext(service);
        const divider1 = context.horizontalDividers[0];
        const divider2 = context.horizontalDividers[1];
        
        // Select first divider
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider1
        });
        
        let currentState = getState(service);
        expect(currentState.value).toBe('selected');
        expect(currentState.context.selectedDivider?.id).toBe(divider1.id);
        
        // Click on second divider while first is selected
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider2
        });
        
        currentState = getState(service);
        expect(currentState.value).toBe('selected');
        expect(currentState.context.selectedDivider?.id).toBe(divider2.id);
    });

    it('should hide ghost dividers when hovering over existing dividers', () => {
        // Add a divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36, positionX: 0
        });
        
        const divider = getContext(service).horizontalDividers[0];
        
        // Start hovering over the divider
        service.send({
            type: 'HOVER_DIVIDER',
            divider: divider
        });
        
        const state = getState(service);
        expect(state.value).toBe('hovering');
        expect(getContext(service).ghostDivider).toBeNull();
        
        // Stop hovering
        service.send({
            type: 'UNHOVER'
        });
        
        expect(getState(service).value).toBe('normal');
    });

    it('should allow hovering dividers when no divider is selected (normal state)', () => {
        // Add two dividers
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36, positionX: 0
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 80,
            positionY: 18, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 18, positionX: 0
        });
        
        assertDividerCount(service, 2, 0);
        
        const context = getContext(service);
        const divider1 = context.horizontalDividers[0];
        const divider2 = context.horizontalDividers[1];
        
        // Initial state - no selection or hover
        expect(getState(service).value).toBe('normal');
        expect(context.selectedDivider).toBeNull();
        expect(context.hoveredDivider).toBeNull();
        
        // Hover over first divider
        service.send({
            type: 'HOVER_DIVIDER',
            divider: divider1
        });
        
        let currentContext = getContext(service);
        expect(getState(service).value).toBe('hovering');
        expect(currentContext.selectedDivider).toBeNull();
        expect(currentContext.hoveredDivider?.id).toBe(divider1.id);
        
        // Stop hovering and hover over second divider
        service.send({
            type: 'UNHOVER'
        });
        
        expect(getState(service).value).toBe('normal');
        
        service.send({
            type: 'HOVER_DIVIDER',
            divider: divider2
        });
        
        currentContext = getContext(service);
        expect(getState(service).value).toBe('hovering');
        expect(currentContext.selectedDivider).toBeNull();
        expect(currentContext.hoveredDivider?.id).toBe(divider2.id);
    });

    it('should handle divider dragging', () => {
        // Add and select a horizontal divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36, positionX: 0
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
            x: 100, y: 100
        });
        
        expect(getState(service).value).toBe('preparingDrag');
        
        // Move mouse to trigger drag (need to move far enough to exceed threshold)
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110, // Move 10+ pixels to exceed drag threshold (√(10²+10²) ≈ 14 > 5)
            positionY: 45, positionX: 0 // Move from 36 to 45 to see position change
        });
        
        let state = getState(service);
        expect(state.value).toBe('dragging');
        expect(getContext(service).isDragging).toBe(true);
        
        // Send another mouse move to ensure position updates in dragging state
        service.send({
            type: 'MOUSE_MOVE',
            x: 120, y: 120,
            positionY: 50, positionX: 0
        });
        
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
        // Add two dividers to the main service
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36, positionX: 0
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 80,
            positionY: 18, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 18, positionX: 0
        });
        
        assertDividerCount(service, 2, 0);
        
        // Select and delete first divider
        let context = getContext(service);
        const divider = context.horizontalDividers[0];
        const dividerId = divider.id;
        
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        // Verify selection worked
        context = getContext(service);
        expect(getState(service).value).toBe('selected');
        expect(context.selectedDivider?.id).toBe(dividerId);
        
        service.send({
            type: 'CLICK_DELETE'
        });
        
        const state = getState(service);
        expect(state.value).toBe('normal');
        assertDividerCount(service, 1, 0);
        expect(getContext(service).selectedDivider).toBeNull();
    });

    it('should allow hovering other dividers while one is selected', () => {
        // Add two dividers
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36, positionX: 0
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 80,
            positionY: 18, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 18, positionX: 0
        });
        
        assertDividerCount(service, 2, 0);
        
        const context = getContext(service);
        const divider1 = context.horizontalDividers[0];
        const divider2 = context.horizontalDividers[1];
        
        // Select first divider
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider1
        });
        
        let currentContext = getContext(service);
        expect(getState(service).value).toBe('selected');
        expect(currentContext.selectedDivider?.id).toBe(divider1.id);
        expect(currentContext.hoveredDivider).toBeNull();
        
        // Hover over second divider while first is selected
        service.send({
            type: 'HOVER_DIVIDER',
            divider: divider2
        });
        
        currentContext = getContext(service);
        expect(getState(service).value).toBe('selected'); // Should remain selected
        expect(currentContext.selectedDivider?.id).toBe(divider1.id); // First divider still selected
        expect(currentContext.hoveredDivider?.id).toBe(divider2.id); // Second divider now hovered
        
        // Test that MOUSE_MOVE alone doesn't change hover state - only explicit HOVER_DIVIDER events
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0 // Move near divider1 position
        });
        
        currentContext = getContext(service);
        // MOUSE_MOVE alone should not change hover state - should still be divider2
        expect(currentContext.hoveredDivider?.id).toBe(divider2.id);
        
        // Test unhover
        service.send({
            type: 'UNHOVER'
        });
        
        currentContext = getContext(service);
        expect(currentContext.selectedDivider?.id).toBe(divider1.id); // Still selected
        expect(currentContext.hoveredDivider).toBeNull(); // No longer hovered
    });

    it('should handle system reset', () => {
        // Add some dividers and select one
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 36, positionX: 0
        });
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 36, positionX: 0
        });
        
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
        assertDividerCount(service, 0, 0);
        expect(context.selectedDivider).toBeNull();
        expect(context.hoveredDivider).toBeNull();
    });
});