import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Constrain Position Debug', () => {
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

    it('should debug constrainDividerPosition function', () => {
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
        
        console.log('=== INITIAL STATE ===');
        console.log('ShelfConfig:', state.context.shelfConfig);
        console.log('HorizontalDividers:', state.context.horizontalDividers);
        
        // Hover sequence
        service.send({
            type: 'HOVER_DIVIDER',
            divider: { id: dividerId, type: 'horizontal', position: 50 }
        });
        
        service.send({
            type: 'UNHOVER'
        });
        
        // Select and drag
        service.send({
            type: 'CLICK_DIVIDER',
            divider: { id: dividerId, type: 'horizontal', position: 50 }
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER SELECTION ===');
        console.log('SelectedDivider:', state.context.selectedDivider);
        console.log('ShelfConfig:', state.context.shelfConfig);
        console.log('HorizontalDividers:', state.context.horizontalDividers);
        
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        // This is where the issue happens
        service.send({
            type: 'MOUSE_MOVE',
            x: 105, y: 105,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        console.log('=== AFTER DRAG MOVE ===');
        console.log('Event positionY was: 60');
        console.log('SelectedDivider position:', state.context.selectedDivider?.position);
        console.log('ShelfConfig:', state.context.shelfConfig);
        
        // Let's manually test the constrainDividerPosition logic
        const config = state.context.shelfConfig;
        const allDividers = state.context.horizontalDividers;
        
        if (config) {
            const interiorHeight = config.height - (2 * config.materialThickness);
            const minGap = 2; // metric
            
            console.log('=== CONSTRAINT CALCULATION ===');
            console.log('Interior height:', interiorHeight);
            console.log('Input position (60):', 60);
            console.log('Min bound (0 + minGap):', 0 + minGap);
            console.log('Max bound (interiorHeight - minGap):', interiorHeight - minGap);
            
            const constrainedPosition = Math.max(0 + minGap, Math.min(interiorHeight - minGap, 60));
            console.log('Constrained position should be:', constrainedPosition);
        }
        
        expect(state.context.selectedDivider?.position).toBe(60);
    });
});