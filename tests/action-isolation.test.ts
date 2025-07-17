import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Action Isolation Test', () => {
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

    it('should execute updateMousePosition action in dragging state', () => {
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
        
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        // Enter dragging state
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 55, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('=== DRAGGING STATE ANALYSIS ===');
        console.log('State value:', state.value);
        console.log('isDragging:', state.context.isDragging);
        console.log('mousePosition BEFORE second MOUSE_MOVE:', state.context.mousePosition);
        console.log('selectedDivider BEFORE second MOUSE_MOVE:', state.context.selectedDivider);
        
        expect(state.value).toBe('dragging');
        expect(state.context.mousePosition?.positionY).toBe(55);
        
        // Now send another MOUSE_MOVE and check if updateMousePosition executes
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER SECOND MOUSE_MOVE ===');
        console.log('State value:', state.value);
        console.log('mousePosition AFTER second MOUSE_MOVE:', state.context.mousePosition);
        console.log('selectedDivider AFTER second MOUSE_MOVE:', state.context.selectedDivider);
        
        // The key test - did updateMousePosition execute?
        expect(state.context.mousePosition?.positionY).toBe(60);
        
        // And did updateDragPosition execute?
        expect(state.context.selectedDivider?.position).toBe(60);
    });
});