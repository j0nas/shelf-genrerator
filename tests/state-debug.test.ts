import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('State Debug', () => {
    let service: any;
    
    beforeEach(() => {
        service = createDividerSystemService();
        service.start();
        
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

    it('should debug state transitions during hover sequence', () => {
        // Add divider
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
        const divider = state.context.horizontalDividers[0];
        console.log('1. After creating divider - state:', state.value);
        
        // Hover sequence
        service.send({
            type: 'HOVER_DIVIDER',
            divider: divider
        });
        
        state = service.getSnapshot();
        console.log('2. After HOVER_DIVIDER - state:', state.value);
        
        service.send({
            type: 'UNHOVER'
        });
        
        state = service.getSnapshot();
        console.log('3. After UNHOVER - state:', state.value);
        
        // Select
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider
        });
        
        state = service.getSnapshot();
        console.log('4. After CLICK_DIVIDER - state:', state.value);
        console.log('4. dragStartPosition:', state.context.dragStartPosition);
        
        // Start drag
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        state = service.getSnapshot();
        console.log('5. After MOUSE_DOWN - state:', state.value);
        console.log('5. dragStartPosition:', state.context.dragStartPosition);
        
        // Move to start drag
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('6. After MOUSE_MOVE - state:', state.value);
        console.log('6. isDragging:', state.context.isDragging);
        console.log('6. selectedDivider position:', state.context.selectedDivider?.position);
        
        // Check if we're in dragging state
        expect(state.value).toBe('dragging');
        
        if (state.value === 'dragging') {
            expect(state.context.selectedDivider?.position).toBe(60);
        }
    });
});