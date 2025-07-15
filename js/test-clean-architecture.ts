// @ts-nocheck
import { createDividerSystemService } from './divider-state-machine-v2.js';

// Simple test to verify the clean architecture works
export function testCleanArchitecture() {
    console.log('🧪 Testing Clean XState Architecture');
    
    const machine = createDividerSystemService();
    
    // Subscribe to state changes
    machine.onTransition((state) => {
        console.log(`State: ${state.value}`, state.context);
    });
    
    machine.start();
    
    // Test shelf configuration
    console.log('\n1. Setting shelf config...');
    machine.send({
        type: 'UPDATE_SHELF_CONFIG',
        config: {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            units: 'imperial'
        }
    });
    
    // Test mouse movement (should create ghost)
    console.log('\n2. Moving mouse to center...');
    machine.send({
        type: 'MOUSE_MOVE',
        x: 100,
        y: 100,
        positionY: 36, // Center of 72" height
        positionX: 0   // Center of width
    });
    
    // Test adding horizontal divider
    console.log('\n3. Clicking to add horizontal divider...');
    machine.send({
        type: 'CLICK_EMPTY_SPACE',
        positionY: 36,
        positionX: 0
    });
    
    // Test mouse movement near edge (should create vertical ghost)
    console.log('\n4. Moving mouse to edge for vertical divider...');
    machine.send({
        type: 'MOUSE_MOVE',
        x: 200,
        y: 100,
        positionY: 36,
        positionX: -15 // Near left edge
    });
    
    // Test adding vertical divider
    console.log('\n5. Clicking to add vertical divider...');
    machine.send({
        type: 'CLICK_EMPTY_SPACE',
        positionY: 36,
        positionX: -15
    });
    
    // Test selecting divider
    console.log('\n6. Selecting horizontal divider...');
    const horizontalDividers = machine.getSnapshot().context.horizontalDividers;
    if (horizontalDividers.length > 0) {
        machine.send({
            type: 'CLICK_DIVIDER',
            divider: horizontalDividers[0]
        });
    }
    
    // Test drag preparation
    console.log('\n7. Starting drag...');
    machine.send({
        type: 'MOUSE_DOWN',
        x: 100,
        y: 100
    });
    
    // Test actual drag
    console.log('\n8. Dragging...');
    machine.send({
        type: 'MOUSE_MOVE',
        x: 100,
        y: 120,
        positionY: 40,
        positionX: 0
    });
    
    // Test ending drag
    console.log('\n9. Ending drag...');
    machine.send({
        type: 'MOUSE_UP'
    });
    
    // Test deletion
    console.log('\n10. Deleting selected divider...');
    machine.send({
        type: 'CLICK_DELETE'
    });
    
    // Final state
    console.log('\n✅ Final State:', machine.getSnapshot());
    
    return machine;
}

// Run test when this file is imported
if (typeof window !== 'undefined') {
    window.testCleanArchitecture = testCleanArchitecture;
}