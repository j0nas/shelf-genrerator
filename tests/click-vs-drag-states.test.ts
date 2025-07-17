import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Click vs Drag State Behavior', () => {
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
                materialType: 'plywood',
                units: 'metric'
            }
        });
        
        // Add a divider to work with
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
    });

    it('should go to selected state when clicking on hovered divider without dragging', () => {
        let state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        // First hover over the divider
        service.send({
            type: 'HOVER_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('hovering');
        expect(state.context.selectedDivider).toBeNull();
        
        // Mouse down on hovered divider
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('preparingDrag');
        expect(state.context.selectedDivider).toBeTruthy();
        
        // Mouse up without significant movement (click)
        service.send({
            type: 'MOUSE_UP'
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('selected');
        expect(state.context.selectedDivider).toBeTruthy();
        expect(state.context.selectedDivider.id).toBe(dividerId);
    });

    it('should go to dragging state when dragging from hovered divider', () => {
        let state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        // First hover over the divider
        service.send({
            type: 'HOVER_DIVIDER',
            divider: {
                id: dividerId,
                type: 'horizontal',
                position: 50
            }
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('hovering');
        expect(state.context.selectedDivider).toBeNull();
        
        // Mouse down on hovered divider
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('preparingDrag');
        expect(state.context.selectedDivider).toBeTruthy();
        
        // Mouse move with significant movement (drag)
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('dragging');
        expect(state.context.selectedDivider).toBeTruthy();
        expect(state.context.selectedDivider.id).toBe(dividerId);
        expect(state.context.isDragging).toBe(true);
    });

    it('should return to normal state after dragging (not selected)', () => {
        let state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        // Start drag sequence
        service.send({
            type: 'HOVER_DIVIDER',
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
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('dragging');
        
        // End drag
        service.send({
            type: 'MOUSE_UP'
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('normal');
        expect(state.context.selectedDivider).toBeNull();
        expect(state.context.isDragging).toBe(false);
    });

    it('should maintain selected state when clicking on already selected divider', () => {
        let state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        // First select the divider
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
        expect(state.context.selectedDivider).toBeTruthy();
        
        // Click on the same divider again
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
        expect(state.context.selectedDivider).toBeTruthy();
        expect(state.context.selectedDivider.id).toBe(dividerId);
    });

    it('should allow dragging from selected state', () => {
        let state = service.getSnapshot();
        const dividerId = state.context.horizontalDividers[0].id;
        
        // First select the divider
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
        
        // Start drag from selected state
        service.send({
            type: 'MOUSE_DOWN',
            x: 100, y: 100
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('preparingDrag');
        expect(state.context.selectedDivider).toBeTruthy();
        
        // Move to start drag
        service.send({
            type: 'MOUSE_MOVE',
            x: 110, y: 110,
            positionY: 60, positionX: 0,
            isOverPanel: false
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('dragging');
        expect(state.context.selectedDivider).toBeTruthy();
        expect(state.context.isDragging).toBe(true);
        
        // End drag - should go back to normal, not selected
        service.send({
            type: 'MOUSE_UP'
        });
        
        state = service.getSnapshot();
        expect(state.value).toBe('normal');
        expect(state.context.selectedDivider).toBeNull();
    });
});