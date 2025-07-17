import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Multiple Drag Operations Bug', () => {
    let service: any;
    
    beforeEach(() => {
        service = createDividerSystemService();
        service.start();
        
        // Set up initial shelf config
        service.send({
            type: 'UPDATE_SHELF_CONFIG',
            config: {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8,
                materialType: 'plywood'
            }
        });
    });

    it('should handle multiple drag operations in sequence', () => {
        // Add a horizontal divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 50, positionX: 0,
            isOverPanel: false
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 50, positionX: 0
        });
        
        let state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        // === FIRST DRAG OPERATION ===
        console.log('=== FIRST DRAG OPERATION ===');
        
        // Select the divider
        service.send({
            type: 'CLICK_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        // Start first drag
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 55, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('First drag - state:', state.value);
        console.log('First drag - selectedDivider position:', state.context.selectedDivider?.position);
        console.log('First drag - mousePosition:', state.context.mousePosition);
        
        // Move during first drag
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('First drag move - selectedDivider position:', state.context.selectedDivider?.position);
        expect(state.context.selectedDivider?.position).toBe(60);
        
        // Finish first drag
        service.send({
            type: 'MOUSE_UP'
        });
        
        state = service.getSnapshot();
        console.log('After first drag - state:', state.value);
        console.log('After first drag - isDragging:', state.context.isDragging);
        console.log('After first drag - selectedDivider:', state.context.selectedDivider);
        console.log('After first drag - mousePosition:', state.context.mousePosition);
        
        // === SECOND DRAG OPERATION ===
        console.log('=== SECOND DRAG OPERATION ===');
        
        // Start second drag (divider should still be selected)
        service.send({
            type: 'MOUSE_DOWN',
            x: 120, y: 120
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 125, y: 125,
            positionY: 65, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('Second drag - state:', state.value);
        console.log('Second drag - selectedDivider position:', state.context.selectedDivider?.position);
        console.log('Second drag - mousePosition:', state.context.mousePosition);
        
        // Log detailed context for debugging
        console.log('Second drag - full context:', {
            isDragging: state.context.isDragging,
            selectedDivider: state.context.selectedDivider,
            mousePosition: state.context.mousePosition,
            shelfConfig: !!state.context.shelfConfig
        });
        
        // Move during second drag
        service.send({
            type: 'MOUSE_MOVE',
            x: 130, y: 130,
            positionY: 70, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('Second drag move - selectedDivider position:', state.context.selectedDivider?.position);
        
        // This should work just like the first drag
        expect(state.context.selectedDivider?.position).toBe(70);
        
        // Finish second drag
        service.send({
            type: 'MOUSE_UP'
        });
        
        state = service.getSnapshot();
        console.log('After second drag - final position:', state.context.horizontalDividers[0].position);
        expect(state.context.horizontalDividers[0].position).toBe(70);
    });

    it('should handle drag after hover interactions', () => {
        // This tests the specific pattern that might be causing issues
        
        // Add a divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 50, positionX: 0,
            isOverPanel: false
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 50, positionX: 0
        });
        
        let state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        // Hover over the divider (this might affect state)
        service.send({
            type: 'HOVER_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        state = service.getSnapshot();
        console.log('After HOVER_DIVIDER - state:', state.value);
        console.log('After HOVER_DIVIDER - mousePosition:', state.context.mousePosition);
        
        // Unhover
        service.send({
            type: 'UNHOVER'
        });
        
        state = service.getSnapshot();
        console.log('After UNHOVER - state:', state.value);
        console.log('After UNHOVER - mousePosition:', state.context.mousePosition);
        
        // Now select and drag
        service.send({
            type: 'CLICK_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        // Send another MOUSE_MOVE to actually update the drag position
        // (the first MOUSE_MOVE triggers the transition to dragging state)
        service.send({
            type: 'MOUSE_MOVE',
            x: 107, y: 107,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        
        // Debug the exact state
        expect(state.value).toBe('dragging'); // Should be in dragging state
        expect(state.context.isDragging).toBe(true); // Should be dragging
        expect(state.context.selectedDivider).toBeTruthy(); // Should have selected divider
        
        // This is the key check - is mousePosition available?
        if (!state.context.mousePosition) {
            throw new Error('❌ FOUND THE BUG: mousePosition is null after hover/unhover sequence!');
        }
        
        expect(state.context.mousePosition.positionY).toBe(60); // Mouse should be at Y=60
        
        // Should still work after hover interactions
        expect(state.context.selectedDivider?.position).toBe(60);
    });
});