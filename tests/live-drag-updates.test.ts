import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Live Drag Position Updates', () => {
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

    it('should update selectedDivider position during drag operations', () => {
        // Add a horizontal divider first
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
        expect(state.context.horizontalDividers).toHaveLength(1);
        const dividerId = state.context.horizontalDividers[0].id;
        
        // Select the divider
        service.send({
            type: 'CLICK_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('selected');
        expect(state.context.selectedDivider?.position).toBe(50);
        
        // Start dragging
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
        expect(state.value).toBe('dragging');
        expect(state.context.isDragging).toBe(true);
        
        // Send more MOUSE_MOVE events during drag and check if selectedDivider position updates
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('During drag - selectedDivider position:', state.context.selectedDivider?.position);
        console.log('During drag - state:', state.value);
        console.log('During drag - isDragging:', state.context.isDragging);
        
        // This is the key test - selectedDivider position should update during drag
        expect(state.context.selectedDivider?.position).toBe(60);
        
        // Send another MOUSE_MOVE to test continuous updates
        service.send({
            type: 'MOUSE_MOVE',
            x: 115, y: 115,
            positionY: 70, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('Second drag move - selectedDivider position:', state.context.selectedDivider?.position);
        
        // Position should update again
        expect(state.context.selectedDivider?.position).toBe(70);
        
        // Finish the drag
        service.send({
            type: 'MOUSE_UP'
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('selected');
        expect(state.context.isDragging).toBe(false);
        
        // Final position should be committed to the array
        expect(state.context.horizontalDividers[0].position).toBe(70);
    });

    it('should update selectedDivider position for vertical dividers during drag', () => {
        // Add a vertical divider
        service.send({
            type: 'MOUSE_MOVE',
            x: 100, y: 100,
            positionY: 50, positionX: 10,
            isOverPanel: false
        });
        
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 50, positionX: 10
        });
        
        let state = service.getSnapshot();
        expect(state.context.verticalDividers).toHaveLength(1);
        const dividerId = state.context.verticalDividers[0].id;
        
        // Select and start dragging
        service.send({
            type: 'CLICK_DIVIDER',
            divider: {
                id: dividerId,
                type: 'vertical',
                position: 10
            }
        });
        
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 50, positionX: 15,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('dragging');
        
        // Test vertical divider position updates
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 50, positionX: 20,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('Vertical drag - selectedDivider position:', state.context.selectedDivider?.position);
        
        // selectedDivider position should update for vertical dividers too
        expect(state.context.selectedDivider?.position).toBe(20);
    });
});