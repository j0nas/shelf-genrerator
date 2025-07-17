import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Hover Debug', () => {
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

    it('should debug hover sequence effect on mousePosition', () => {
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
        const dividerId = state.context.horizontalDividers[0].id;
        
        console.log('=== BEFORE HOVER ===');
        console.log('State:', state.value);
        console.log('MousePosition:', state.context.mousePosition);
        
        // Hover over the divider
        service.send({
            type: 'HOVER_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER HOVER_DIVIDER ===');
        console.log('State:', state.value);
        console.log('MousePosition:', state.context.mousePosition);
        
        // Unhover
        service.send({
            type: 'UNHOVER'
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER UNHOVER ===');
        console.log('State:', state.value);
        console.log('MousePosition:', state.context.mousePosition);
        
        // Now select and drag
        service.send({
            type: 'CLICK_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER CLICK_DIVIDER ===');
        console.log('State:', state.value);
        console.log('MousePosition:', state.context.mousePosition);
        
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER MOUSE_DOWN ===');
        console.log('State:', state.value);
        console.log('MousePosition:', state.context.mousePosition);
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER MOUSE_MOVE (should be dragging) ===');
        console.log('State:', state.value);
        console.log('MousePosition:', state.context.mousePosition);
        console.log('SelectedDivider:', state.context.selectedDivider);
        
        // The problem is here - selectedDivider position should be 60
        console.log('Expected selectedDivider.position: 60');
        console.log('Actual selectedDivider.position:', state.context.selectedDivider?.position);
        
        expect(state.context.selectedDivider?.position).toBe(60);
    });
});