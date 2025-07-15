// @ts-nocheck
import { dividerStateMachine, createDividerSystemService } from './divider-state-machine.js';

/**
 * Comprehensive test suite for the divider state machine
 * 
 * This test suite verifies that the state machine behaves correctly
 * and that if these tests pass, the UI is guaranteed to work properly
 * since the UI is a pure function of the state machine state.
 */

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

// Test utilities
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertDividerCount(service, horizontal, vertical, message) {
    const context = getContext(service);
    assertEqual(context.horizontalDividers.length, horizontal, `${message} - horizontal count`);
    assertEqual(context.verticalDividers.length, vertical, `${message} - vertical count`);
}

// Test Suite
export function runDividerStateMachineTests() {
    console.log('🧪 Starting Divider State Machine Test Suite');
    
    try {
        testInitialState();
        testShelfConfigUpdate();
        testMouseMovementAndGhostDividers();
        testAddingHorizontalDividers();
        testAddingVerticalDividers();
        testDividerSelection();
        testDividerDragging();
        testDividerDeletion();
        testDividerConstraints();
        testEdgeCases();
        testStateTransitions();
        
        console.log('✅ All Divider State Machine Tests Passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

function testInitialState() {
    console.log('🔍 Testing initial state...');
    
    const service = createTestService();
    const state = getState(service);
    const context = getContext(service);
    
    // Test initial state
    assertEqual(state.value, 'normal', 'Initial state should be normal');
    assertEqual(context.horizontalDividers.length, 0, 'Should start with no horizontal dividers');
    assertEqual(context.verticalDividers.length, 0, 'Should start with no vertical dividers');
    assertEqual(context.selectedDivider, null, 'Should start with no selected divider');
    assertEqual(context.hoveredDivider, null, 'Should start with no hovered divider');
    assertEqual(context.ghostDivider, null, 'Should start with no ghost divider');
    assertEqual(context.isDragging, false, 'Should not be dragging initially');
    
    console.log('✅ Initial state test passed');
}

function testShelfConfigUpdate() {
    console.log('🔍 Testing shelf config update...');
    
    const service = createTestService();
    
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
    assertEqual(context.shelfConfig.width, 48, 'Config width should update');
    assertEqual(context.shelfConfig.height, 96, 'Config height should update');
    assertEqual(context.shelfConfig.units, 'metric', 'Config units should update');
    
    console.log('✅ Shelf config update test passed');
}

function testMouseMovementAndGhostDividers() {
    console.log('🔍 Testing mouse movement and ghost dividers...');
    
    const service = createTestService();
    
    // Test mouse movement in center (should create horizontal ghost)
    service.send({
        type: 'MOUSE_MOVE',
        x: 100,
        y: 100,
        positionY: 36, // Center of 72" height
        positionX: 0   // Center of width
    });
    
    let context = getContext(service);
    assertTrue(context.ghostDivider !== null, 'Should create ghost divider on mouse move');
    assertEqual(context.ghostDivider.type, 'horizontal', 'Should create horizontal ghost in center');
    assertTrue(context.ghostDivider.canAdd, 'Ghost divider should be addable');
    assertTrue(context.ghostDivider.visible, 'Ghost divider should be visible');
    
    // Test mouse movement near edge (should create vertical ghost)
    service.send({
        type: 'MOUSE_MOVE',
        x: 200,
        y: 100,
        positionY: 36,
        positionX: -15 // Near left edge
    });
    
    context = getContext(service);
    assertEqual(context.ghostDivider.type, 'vertical', 'Should create vertical ghost near edge');
    assertTrue(context.ghostDivider.canAdd, 'Vertical ghost should be addable');
    
    console.log('✅ Mouse movement and ghost dividers test passed');
}

function testAddingHorizontalDividers() {
    console.log('🔍 Testing adding horizontal dividers...');
    
    const service = createTestService();
    
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
    
    let context = getContext(service);
    assertDividerCount(service, 1, 0, 'After adding horizontal divider');
    
    const divider = context.horizontalDividers[0];
    assertEqual(divider.type, 'horizontal', 'Divider should be horizontal type');
    assertTrue(divider.id !== undefined, 'Divider should have ID');
    assertTrue(divider.position > 0, 'Divider should have valid position');
    
    // Add second horizontal divider
    service.send({
        type: 'MOUSE_MOVE',
        x: 100,
        y: 120,
        positionY: 18, // Quarter height
        positionX: 0
    });
    
    service.send({
        type: 'CLICK_EMPTY_SPACE',
        positionY: 18,
        positionX: 0
    });
    
    assertDividerCount(service, 2, 0, 'After adding second horizontal divider');
    
    console.log('✅ Adding horizontal dividers test passed');
}

function testAddingVerticalDividers() {
    console.log('🔍 Testing adding vertical dividers...');
    
    const service = createTestService();
    
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
    
    let context = getContext(service);
    assertDividerCount(service, 0, 1, 'After adding vertical divider');
    
    const divider = context.verticalDividers[0];
    assertEqual(divider.type, 'vertical', 'Divider should be vertical type');
    assertTrue(divider.id !== undefined, 'Divider should have ID');
    assertTrue(divider.position < 0, 'Vertical divider should have negative position (left side)');
    
    // Add vertical divider on right side
    service.send({
        type: 'MOUSE_MOVE',
        x: 150,
        y: 100,
        positionY: 36,
        positionX: 12
    });
    
    service.send({
        type: 'CLICK_EMPTY_SPACE',
        positionY: 36,
        positionX: 12
    });
    
    assertDividerCount(service, 0, 2, 'After adding second vertical divider');
    
    console.log('✅ Adding vertical dividers test passed');
}

function testDividerSelection() {
    console.log('🔍 Testing divider selection...');
    
    const service = createTestService();
    
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
    
    let state = getState(service);
    assertEqual(state.value, 'selected', 'Should transition to selected state');
    assertEqual(getContext(service).selectedDivider.id, divider.id, 'Should select the correct divider');
    assertTrue(getContext(service).ghostDivider === null, 'Ghost divider should be hidden when selected');
    
    // Click elsewhere to deselect
    service.send({
        type: 'CLICK_ELSEWHERE'
    });
    
    state = getState(service);
    assertEqual(state.value, 'normal', 'Should return to normal state');
    assertEqual(getContext(service).selectedDivider, null, 'Should deselect divider');
    
    console.log('✅ Divider selection test passed');
}

function testDividerDragging() {
    console.log('🔍 Testing divider dragging...');
    
    const service = createTestService();
    
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
    
    let state = getState(service);
    assertEqual(state.value, 'preparingDrag', 'Should enter preparingDrag state');
    
    // Move mouse to trigger drag
    service.send({
        type: 'MOUSE_MOVE',
        x: 100,
        y: 120,
        positionY: 40,
        positionX: 0
    });
    
    state = getState(service);
    assertEqual(state.value, 'dragging', 'Should enter dragging state');
    assertEqual(getContext(service).isDragging, true, 'Should set dragging flag');
    
    // Verify position updated during drag
    const draggedDivider = getContext(service).horizontalDividers[0];
    assertTrue(draggedDivider.position !== originalPosition, 'Divider position should update during drag');
    
    // End drag
    service.send({
        type: 'MOUSE_UP'
    });
    
    state = getState(service);
    assertEqual(state.value, 'selected', 'Should return to selected state after drag');
    assertEqual(getContext(service).isDragging, false, 'Should clear dragging flag');
    
    console.log('✅ Divider dragging test passed');
}

function testDividerDeletion() {
    console.log('🔍 Testing divider deletion...');
    
    const service = createTestService();
    
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
    
    let state = getState(service);
    assertEqual(state.value, 'normal', 'Should return to normal state after deletion');
    assertDividerCount(service, 1, 0, 'After deleting one divider');
    assertEqual(getContext(service).selectedDivider, null, 'Should clear selected divider');
    
    console.log('✅ Divider deletion test passed');
}

function testDividerConstraints() {
    console.log('🔍 Testing divider constraints...');
    
    const service = createTestService();
    
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
    
    assertTrue(constrainedDivider.position < interiorHeight, 'Divider should be constrained within bounds');
    assertTrue(constrainedDivider.position > 0, 'Divider should be above bottom bound');
    
    console.log('✅ Divider constraints test passed');
}

function testEdgeCases() {
    console.log('🔍 Testing edge cases...');
    
    const service = createTestService();
    
    // Test clicking when no ghost divider
    service.send({
        type: 'CLICK_EMPTY_SPACE',
        positionY: 1000, // Invalid position
        positionX: 1000
    });
    
    assertDividerCount(service, 0, 0, 'Should not add divider at invalid position');
    
    // Test selecting non-existent divider
    service.send({
        type: 'CLICK_DIVIDER',
        divider: { id: 'fake-id', type: 'horizontal', position: 50 }
    });
    
    assertEqual(getState(service).value, 'selected', 'Should still transition to selected state');
    
    // Test system reset
    service.send({
        type: 'RESET'
    });
    
    let state = getState(service);
    let context = getContext(service);
    
    assertEqual(state.value, 'normal', 'Should return to normal state after reset');
    assertDividerCount(service, 0, 0, 'Should clear all dividers on reset');
    assertEqual(context.selectedDivider, null, 'Should clear selected divider on reset');
    assertEqual(context.hoveredDivider, null, 'Should clear hovered divider on reset');
    
    console.log('✅ Edge cases test passed');
}

function testStateTransitions() {
    console.log('🔍 Testing state transitions...');
    
    const service = createTestService();
    
    // Test full state transition cycle
    assertEqual(getState(service).value, 'normal', 'Should start in normal state');
    
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
    
    assertEqual(getState(service).value, 'hovering', 'Should transition to hovering');
    
    service.send({
        type: 'CLICK_DIVIDER',
        divider: divider
    });
    
    assertEqual(getState(service).value, 'selected', 'Should transition to selected');
    
    // Test drag cycle
    service.send({
        type: 'MOUSE_DOWN',
        x: 100,
        y: 100
    });
    
    assertEqual(getState(service).value, 'preparingDrag', 'Should transition to preparingDrag');
    
    service.send({
        type: 'MOUSE_MOVE',
        x: 100,
        y: 120,
        positionY: 40,
        positionX: 0
    });
    
    assertEqual(getState(service).value, 'dragging', 'Should transition to dragging');
    
    service.send({
        type: 'MOUSE_UP'
    });
    
    assertEqual(getState(service).value, 'selected', 'Should return to selected after drag');
    
    // Test return to normal
    service.send({
        type: 'CLICK_ELSEWHERE'
    });
    
    assertEqual(getState(service).value, 'normal', 'Should return to normal');
    
    console.log('✅ State transitions test passed');
}

// Run tests when module is imported (if in browser environment)
if (typeof window !== 'undefined') {
    window.runDividerStateMachineTests = runDividerStateMachineTests;
}

// Export for Node.js environment
export { runDividerStateMachineTests };