import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Mouse Position Update Bug', () => {
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

    it('should update mouse position correctly in all states', () => {
        // Test in normal state
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 50, positionX: 0,
            isOverPanel: false
        });
        
        let state = service.getSnapshot();
        expect(state.context.mousePosition?.positionY).toBe(50);
        console.log('Normal state - mousePosition works:', state.context.mousePosition?.positionY);
        
        // Add divider and select it
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 50, positionX: 0
        });
        
        state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        service.send({
            type: 'CLICK_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        // Test in selected state
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 55, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        expect(state.context.mousePosition?.positionY).toBe(55);
        console.log('Selected state - mousePosition works:', state.context.mousePosition?.positionY);
        
        // Start drag
        service.send({
            type: 'MOUSE_DOWN',
            x: 105, y: 105
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('dragging');
        console.log('Dragging state - mousePosition:', state.context.mousePosition?.positionY);
        console.log('Dragging state - are we really in dragging state?', state.value);
        console.log('Dragging state - full state:', state);
        
        // This should be 60, not 55
        expect(state.context.mousePosition?.positionY).toBe(60);
    });

    it('should update mouse position after hover sequence', () => {
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
        
        // Do hover sequence
        service.send({
            type: 'HOVER_DIVIDER',
            divider: { id: dividerId, type: 'horizontal', position: 50 }
        });
        
        service.send({
            type: 'UNHOVER'
        });
        
        // Select divider  
        service.send({
            type: 'CLICK_DIVIDER',
            divider: { id: dividerId, type: 'horizontal', position: 50 }
        });
        
        // Start drag
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        // Test if mouse position updates in dragging state after hover
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('After hover sequence - dragging state mousePosition:', state.context.mousePosition?.positionY);
        
        // The bug: this will be the old position, not 60
        expect(state.context.mousePosition?.positionY).toBe(60);
    });
});