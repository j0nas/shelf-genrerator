import { describe, it, expect, beforeEach } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';
import { DistanceLabelManager } from '../js/distance-labels.js';

describe('Material Thickness Constraints', () => {
    let service: any;
    let manager: DistanceLabelManager;
    
    const testConfig = {
        width: 91,
        height: 183,
        depth: 30,
        materialThickness: 1.8,
        materialType: 'plywood',
        units: 'metric' as const
    };
    
    beforeEach(() => {
        service = createDividerSystemService();
        service.start();
        
        service.send({
            type: 'UPDATE_SHELF_CONFIG',
            config: testConfig
        });
        
        // Mock DOM elements for DistanceLabelManager
        const container = document.createElement('div');
        container.id = 'distance-labels';
        document.body.appendChild(container);
        
        const camera = {} as any;
        const renderer = {} as any;
        const scene = {} as any;
        
        manager = new DistanceLabelManager(container, camera, renderer, scene);
    });

    describe('Horizontal Divider Constraints', () => {
        it('should prevent horizontal dividers from overlapping with bottom carcass', () => {
            const interiorHeight = testConfig.height - (2 * testConfig.materialThickness);
            const expectedMinPosition = testConfig.materialThickness / 2; // 0.9cm
            
            // Try to place divider at position 0 (would overlap with bottom carcass)
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 0,
                positionX: 0,
                isOverPanel: false
            });
            
            const stateAfterMove = service.getSnapshot();
            console.log('Ghost divider after mouse move:', stateAfterMove.context.ghostDivider);
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 0,
                positionX: 0
            });
            
            const state = service.getSnapshot();
            console.log('Final state after click:', state.context.horizontalDividers);
            
            // Should have one divider, but constrained to minimum position
            expect(state.context.horizontalDividers).toHaveLength(1);
            expect(state.context.horizontalDividers[0].position).toBe(expectedMinPosition);
            
            // Distance to bottom should be 0 when at constraint limit
            const distances = manager.calculateHorizontalDividerDistances(
                state.context.horizontalDividers[0],
                state.context.horizontalDividers,
                testConfig
            );
            
            const distanceToBottom = distances.find(d => d.toType === 'carcass' && d.toName === 'Bottom');
            expect(distanceToBottom?.distance).toBe(0);
        });

        it('should prevent horizontal dividers from overlapping with top carcass', () => {
            const interiorHeight = testConfig.height - (2 * testConfig.materialThickness);
            const expectedMaxPosition = interiorHeight - (testConfig.materialThickness / 2); // 178.5cm
            
            // Try to place divider at maximum interior height (would overlap with top carcass)
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: interiorHeight,
                positionX: 0,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: interiorHeight,
                positionX: 0
            });
            
            const state = service.getSnapshot();
            
            // Should have one divider, but constrained to maximum position
            expect(state.context.horizontalDividers).toHaveLength(1);
            expect(state.context.horizontalDividers[0].position).toBe(expectedMaxPosition);
            
            // Distance to top should be 0 when at constraint limit
            const distances = manager.calculateHorizontalDividerDistances(
                state.context.horizontalDividers[0],
                state.context.horizontalDividers,
                testConfig
            );
            
            const distanceToTop = distances.find(d => d.toType === 'carcass' && d.toName === 'Top');
            expect(distanceToTop?.distance).toBe(0);
        });

        it('should maintain correct spacing between horizontal dividers', () => {
            const interiorHeight = testConfig.height - (2 * testConfig.materialThickness);
            
            // Add first divider at 30cm
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 30,
                positionX: 0,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 30,
                positionX: 0
            });
            
            // Add second divider at 32cm (only 2cm away)
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 32,
                positionX: 0,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 32,
                positionX: 0
            });
            
            const state = service.getSnapshot();
            
            // Should have two dividers with proper spacing
            expect(state.context.horizontalDividers).toHaveLength(2);
            
            const divider1 = state.context.horizontalDividers[0];
            const divider2 = state.context.horizontalDividers[1];
            
            // Distance between dividers should account for material thickness
            const distances = manager.calculateHorizontalDividerDistances(
                divider1,
                state.context.horizontalDividers,
                testConfig
            );
            
            const distanceToDivider = distances.find(d => d.toType === 'divider' || d.toType === 'combined');
            expect(distanceToDivider?.distance).toBe(Math.abs(divider2.position - divider1.position) - testConfig.materialThickness);
        });
    });

    describe('Vertical Divider Constraints', () => {
        it('should prevent vertical dividers from overlapping with left carcass', () => {
            const interiorWidth = testConfig.width - (2 * testConfig.materialThickness);
            const expectedMinPosition = (-interiorWidth / 2) + (testConfig.materialThickness / 2); // -42.8cm
            
            // Try to place divider at left boundary (would overlap with left carcass)
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 50,
                positionX: -interiorWidth / 2,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 50,
                positionX: -interiorWidth / 2
            });
            
            const state = service.getSnapshot();
            
            // Should have one divider, but constrained to minimum position
            expect(state.context.verticalDividers).toHaveLength(1);
            expect(state.context.verticalDividers[0].position).toBe(expectedMinPosition);
            
            // Distance to left should be 0 when at constraint limit
            const distances = manager.calculateVerticalDividerDistances(
                state.context.verticalDividers[0],
                state.context.verticalDividers,
                testConfig
            );
            
            const distanceToLeft = distances.find(d => d.toType === 'carcass' && d.toName === 'Left');
            expect(distanceToLeft?.distance).toBe(0);
        });

        it('should prevent vertical dividers from overlapping with right carcass', () => {
            const interiorWidth = testConfig.width - (2 * testConfig.materialThickness);
            const expectedMaxPosition = (interiorWidth / 2) - (testConfig.materialThickness / 2); // 42.8cm
            
            // Try to place divider at right boundary (would overlap with right carcass)
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 50,
                positionX: interiorWidth / 2,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 50,
                positionX: interiorWidth / 2
            });
            
            const state = service.getSnapshot();
            
            // Should have one divider, but constrained to maximum position
            expect(state.context.verticalDividers).toHaveLength(1);
            expect(state.context.verticalDividers[0].position).toBe(expectedMaxPosition);
            
            // Distance to right should be 0 when at constraint limit
            const distances = manager.calculateVerticalDividerDistances(
                state.context.verticalDividers[0],
                state.context.verticalDividers,
                testConfig
            );
            
            const distanceToRight = distances.find(d => d.toType === 'carcass' && d.toName === 'Right');
            expect(distanceToRight?.distance).toBe(0);
        });

        it('should maintain correct spacing between vertical dividers', () => {
            // Add first divider at center-left area
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 50,
                positionX: -20,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 50,
                positionX: -20
            });
            
            let state = service.getSnapshot();
            
            // Should have one divider
            expect(state.context.verticalDividers).toHaveLength(1);
            
            // Add second divider at center-right area (far enough for spacing)
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 50,
                positionX: 20,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 50,
                positionX: 20
            });
            
            state = service.getSnapshot();
            
            // Should have two dividers with proper spacing
            expect(state.context.verticalDividers).toHaveLength(2);
            
            const divider1 = state.context.verticalDividers[0];
            const divider2 = state.context.verticalDividers[1];
            
            // Distance between dividers should account for material thickness
            const distances = manager.calculateVerticalDividerDistances(
                divider1,
                state.context.verticalDividers,
                testConfig
            );
            
            const distanceToDivider = distances.find(d => d.toType === 'divider');
            expect(distanceToDivider?.distance).toBe(Math.abs(divider2.position - divider1.position) - testConfig.materialThickness);
        });
    });

    describe('Edge Cases', () => {
        it('should handle different material thicknesses correctly', () => {
            const thickConfig = {
                ...testConfig,
                materialThickness: 3.0 // Thicker material
            };
            
            service.send({
                type: 'UPDATE_SHELF_CONFIG',
                config: thickConfig
            });
            
            const interiorHeight = thickConfig.height - (2 * thickConfig.materialThickness);
            const expectedMinPosition = thickConfig.materialThickness / 2; // 1.5cm
            
            // Try to place divider at position 0
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 0,
                positionX: 0,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 0,
                positionX: 0
            });
            
            const state = service.getSnapshot();
            
            // Should be constrained to the new minimum position
            expect(state.context.horizontalDividers[0].position).toBe(expectedMinPosition);
            
            // Distance calculation should also account for the thicker material
            const distances = manager.calculateHorizontalDividerDistances(
                state.context.horizontalDividers[0],
                state.context.horizontalDividers,
                thickConfig
            );
            
            const distanceToBottom = distances.find(d => d.toType === 'carcass' && d.toName === 'Bottom');
            expect(distanceToBottom?.distance).toBe(0);
        });

        it('should maintain accuracy when dividers are dragged to limits', () => {
            const interiorHeight = testConfig.height - (2 * testConfig.materialThickness);
            
            // Add a divider in the middle
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 50,
                positionX: 0,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 50,
                positionX: 0
            });
            
            let state = service.getSnapshot();
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
            
            // Start dragging
            service.send({
                type: 'MOUSE_DOWN',
                x: 100, y: 100
            });
            
            // Try to drag to bottom (position 0)
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 0,
                positionY: 0,
                positionX: 0,
                isOverPanel: false
            });
            
            // Send another MOUSE_MOVE to ensure drag position is applied
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 0,
                positionY: 0,
                positionX: 0,
                isOverPanel: false
            });
            
            state = service.getSnapshot();
            
            // Should be constrained to minimum position
            const expectedMinPosition = testConfig.materialThickness / 2;
            expect(state.context.selectedDivider?.position).toBe(expectedMinPosition);
            
            // Distance to bottom should be 0
            const distances = manager.calculateHorizontalDividerDistances(
                state.context.selectedDivider!,
                state.context.horizontalDividers,
                testConfig
            );
            
            const distanceToBottom = distances.find(d => d.toType === 'carcass' && d.toName === 'Bottom');
            expect(distanceToBottom?.distance).toBe(0);
        });
    });
});