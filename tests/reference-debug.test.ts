import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Reference Debug', () => {
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

    it('should debug object references in selectedDivider', () => {
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
        const dividerInArray = state.context.horizontalDividers[0];
        
        console.log('=== ORIGINAL DIVIDER ===');
        console.log('Divider in array:', dividerInArray);
        console.log('ID:', dividerInArray.id);
        console.log('Position:', dividerInArray.position);
        
        // Hover sequence
        service.send({
            type: 'HOVER_DIVIDER',
            divider: dividerInArray
        });
        
        service.send({
            type: 'UNHOVER'
        });
        
        // Select divider
        service.send({
            type: 'CLICK_DIVIDER',
            divider: dividerInArray
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER SELECTION ===');
        console.log('selectedDivider:', state.context.selectedDivider);
        console.log('Divider in array:', state.context.horizontalDividers[0]);
        console.log('Are they the same object?', state.context.selectedDivider === state.context.horizontalDividers[0]);
        console.log('Do they have the same ID?', state.context.selectedDivider?.id === state.context.horizontalDividers[0].id);
        console.log('Do they have the same position?', state.context.selectedDivider?.position === state.context.horizontalDividers[0].position);
        
        // Start drag
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
        
        state = service.getSnapshot();
        console.log('=== AFTER DRAG ===');
        console.log('selectedDivider position:', state.context.selectedDivider?.position);
        console.log('Divider in array position:', state.context.horizontalDividers[0].position);
        console.log('Are they the same object?', state.context.selectedDivider === state.context.horizontalDividers[0]);
        
        // Both should be updated to 60
        expect(state.context.selectedDivider?.position).toBe(60);
        expect(state.context.horizontalDividers[0].position).toBe(60);
    });
});