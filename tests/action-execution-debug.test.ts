import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Action Execution Debug', () => {
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

    it('should execute actions in dragging state - step by step debug', () => {
        // Create and select a divider
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
        
        service.send({
            type: 'CLICK_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        state = service.getSnapshot();
        console.log('1. After selecting divider:');
        console.log('   State:', state.value);
        console.log('   MousePosition:', state.context.mousePosition?.positionY);
        expect(state.value).toBe('selected');
        
        // Start drag
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        state = service.getSnapshot();
        console.log('2. After MOUSE_DOWN:');
        console.log('   State:', state.value);
        console.log('   MousePosition:', state.context.mousePosition?.positionY);
        expect(state.value).toBe('preparingDrag');
        
        // Send first MOUSE_MOVE to trigger drag
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,  // 10√2 ≈ 14.14 pixels, should exceed threshold
            positionY: 55, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('3. After first MOUSE_MOVE (should enter dragging):');
        console.log('   State:', state.value);
        console.log('   MousePosition:', state.context.mousePosition?.positionY);
        console.log('   IsDragging:', state.context.isDragging);
        
        // This should now be in dragging state
        expect(state.value).toBe('dragging');
        expect(state.context.mousePosition?.positionY).toBe(55);
        
        // Send second MOUSE_MOVE while in dragging state
        service.send({
            type: 'MOUSE_MOVE',
            x: 120, y: 120,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('4. After second MOUSE_MOVE (should stay in dragging):');
        console.log('   State:', state.value);
        console.log('   MousePosition:', state.context.mousePosition?.positionY);
        console.log('   SelectedDivider position:', state.context.selectedDivider?.position);
        
        // This is the failing assertion - mousePosition should update to 60
        expect(state.value).toBe('dragging');
        expect(state.context.mousePosition?.positionY).toBe(60);
    });
});