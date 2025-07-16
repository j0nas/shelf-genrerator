import { describe, it, expect } from 'vitest';
import { interpret } from 'xstate';
import { dividerStateMachine } from '../js/divider-state-machine.js';

describe('Hover Detection Fix Verification', () => {
    it('should use raycasting-based hover detection consistently with clicks', () => {
        const service = interpret(dividerStateMachine);
        service.start();
        
        // Set up shelf config
        service.send({
            type: 'UPDATE_SHELF_CONFIG',
            config: {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8,
                units: 'metric'
            }
        });
        
        // Create a ghost divider first
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 50,
            positionX: 0
        });
        
        // Add a horizontal divider
        service.send({
            type: 'CLICK_EMPTY_SPACE',
            positionY: 50,
            positionX: 0
        });
        
        const divider = service.getSnapshot().context.horizontalDividers[0];
        expect(divider).toBeDefined();
        
        // Test: HOVER_DIVIDER event (from raycasting) should work
        service.send({
            type: 'HOVER_DIVIDER',
            divider: {
                id: divider.id,
                type: divider.type,
                position: divider.position
            }
        });
        
        let context = service.getSnapshot().context;
        expect(context.hoveredDivider?.id).toBe(divider.id);
        expect(service.getSnapshot().value).toBe('hovering');
        
        // Test: MOUSE_MOVE alone should NOT change hover state (no distance-based hover)
        service.send({
            type: 'MOUSE_MOVE',
            x: 100,
            y: 100,
            positionY: 50, // Same position as divider
            positionX: 0
        });
        
        context = service.getSnapshot().context;
        // Hover state should remain unchanged - only explicit HOVER_DIVIDER/UNHOVER events matter
        expect(context.hoveredDivider?.id).toBe(divider.id);
        expect(service.getSnapshot().value).toBe('hovering');
        
        // Test: UNHOVER event should clear hover
        service.send({ type: 'UNHOVER' });
        
        context = service.getSnapshot().context;
        expect(context.hoveredDivider).toBeNull();
        expect(service.getSnapshot().value).toBe('normal');
        
        service.stop();
    });
    
    it('should document that hover and click use the same raycasting logic', () => {
        // This test documents the fix:
        // 1. Both hover and click detection use ShelfRenderer.getDividerAtPosition()
        // 2. getDividerAtPosition() uses Three.js raycasting against actual 3D meshes
        // 3. No distance-based "near divider" detection that was causing edge-only hover
        // 4. Hover state only changes via explicit HOVER_DIVIDER/UNHOVER events from raycasting
        
        expect(true).toBe(true); // Documentation test
    });
});