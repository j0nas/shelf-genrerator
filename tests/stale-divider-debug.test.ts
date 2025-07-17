import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Stale Divider Debug', () => {
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

    it('should debug stale divider reference issue', () => {
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
        
        console.log('=== CREATED DIVIDER ===');
        console.log('Divider from state:', divider);
        
        // Hover sequence
        service.send({
            type: 'HOVER_DIVIDER',
            divider: divider  // Use the actual divider from state
        });
        
        service.send({
            type: 'UNHOVER'
        });
        
        // Select using the actual divider from state
        service.send({
            type: 'CLICK_DIVIDER',
            divider: divider  // Use the actual divider from state
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER SELECTION ===');
        console.log('SelectedDivider:', state.context.selectedDivider);
        console.log('HorizontalDividers[0]:', state.context.horizontalDividers[0]);
        
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
        console.log('=== AFTER DRAG MOVE ===');
        console.log('SelectedDivider position:', state.context.selectedDivider?.position);
        console.log('HorizontalDividers[0] position:', state.context.horizontalDividers[0].position);
        
        expect(state.context.selectedDivider?.position).toBe(60);
    });
});