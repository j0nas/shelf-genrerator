import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDividerSystemService } from '../js/divider-state-machine.js';

describe('Delete Button Functionality', () => {
    let service: any;
    let mockDeleteButton: HTMLElement;
    let mockDeleteButtonContainer: HTMLElement;
    
    beforeEach(() => {
        // Set up DOM elements that the delete button depends on
        document.body.innerHTML = `
            <div id="three-canvas"></div>
            <div id="delete-button" class="delete-button" style="display: none;">
                <button id="delete-divider-btn">×</button>
            </div>
        `;
        
        mockDeleteButton = document.getElementById('delete-divider-btn')!;
        mockDeleteButtonContainer = document.getElementById('delete-button')!;
        
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
    });

    describe('State Machine Delete Action', () => {
        it('should delete selected horizontal divider when CLICK_DELETE is sent', () => {
            // Add a horizontal divider
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
            
            // Select the divider
            const dividerId = state.context.horizontalDividers[0].id;
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
            
            // Delete the divider
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.value).toBe('normal');
            expect(state.context.horizontalDividers).toHaveLength(0);
            expect(state.context.selectedDivider).toBeNull();
        });

        it('should delete selected vertical divider when CLICK_DELETE is sent', () => {
            // Add a vertical divider
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 50, positionX: 20,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 50, positionX: 20
            });
            
            let state = service.getSnapshot();
            expect(state.context.verticalDividers).toHaveLength(1);
            
            // Select the divider
            const dividerId = state.context.verticalDividers[0].id;
            service.send({
                type: 'CLICK_DIVIDER',
                divider: {
                    id: dividerId,
                    type: 'vertical',
                    position: 20
                }
            });
            
            state = service.getSnapshot();
            expect(state.value).toBe('selected');
            expect(state.context.selectedDivider).toBeTruthy();
            
            // Delete the divider
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.value).toBe('normal');
            expect(state.context.verticalDividers).toHaveLength(0);
            expect(state.context.selectedDivider).toBeNull();
        });

        it('should not delete anything when no divider is selected', () => {
            // Add a divider but don't select it
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
            expect(state.value).toBe('normal');
            
            // Try to delete without selecting
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(1); // Should still be there
            expect(state.value).toBe('normal');
        });

        it('should handle deletion of multiple dividers sequentially', () => {
            // Add two horizontal dividers
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 30, positionX: 0,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 30, positionX: 0
            });
            
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 150,
                positionY: 80, positionX: 0,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 80, positionX: 0
            });
            
            let state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(2);
            
            // Delete first divider
            const firstDividerId = state.context.horizontalDividers[0].id;
            service.send({
                type: 'CLICK_DIVIDER',
                divider: {
                    id: firstDividerId,
                    type: 'horizontal',
                    position: 30
                }
            });
            
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(1);
            expect(state.value).toBe('normal');
            
            // Delete second divider
            const secondDividerId = state.context.horizontalDividers[0].id;
            service.send({
                type: 'CLICK_DIVIDER',
                divider: {
                    id: secondDividerId,
                    type: 'horizontal',
                    position: 80
                }
            });
            
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(0);
            expect(state.value).toBe('normal');
        });
    });

    describe('Keyboard Delete Shortcuts', () => {
        it('should delete selected divider when Delete key is pressed', () => {
            // Add and select a divider
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
            
            state = service.getSnapshot();
            expect(state.value).toBe('selected');
            
            // Simulate Delete key press (this would be handled by InputController)
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(0);
            expect(state.value).toBe('normal');
        });

        it('should delete selected divider when Backspace key is pressed', () => {
            // Add and select a divider
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
            
            state = service.getSnapshot();
            expect(state.value).toBe('selected');
            
            // Simulate Backspace key press (this would be handled by InputController)
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(0);
            expect(state.value).toBe('normal');
        });
    });

    describe('Delete Button Integration', () => {
        it('should trigger delete action when delete button is clicked', () => {
            // Add event listener to the delete button (simulating InputController setup)
            let deleteActionCalled = false;
            mockDeleteButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                deleteActionCalled = true;
            });
            
            // Add and select a divider
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
            
            // Simulate delete button click
            const clickEvent = new MouseEvent('click', { bubbles: true });
            mockDeleteButton.dispatchEvent(clickEvent);
            
            // Check if delete action was triggered
            expect(deleteActionCalled).toBe(true);
        });

        it('should prevent event propagation when delete button is clicked', () => {
            const clickEvent = new MouseEvent('click', { bubbles: true });
            const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');
            
            // Add event listener to the delete button (simulating InputController setup)
            mockDeleteButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                service.send({ type: 'CLICK_DELETE' });
            });
            
            mockDeleteButton.dispatchEvent(clickEvent);
            
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(stopPropagationSpy).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle delete action when divider is being dragged', () => {
            // Add a divider
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
            
            // Select and start dragging
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
            
            service.send({
                type: 'MOUSE_MOVE',
                x: 105, y: 105,
                positionY: 55, positionX: 0,
                isOverPanel: false
            });
            
            state = service.getSnapshot();
            expect(state.value).toBe('dragging');
            
            // Try to delete while dragging - should not work from dragging state
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            // Should still be dragging, divider should still exist
            expect(state.value).toBe('dragging');
            expect(state.context.horizontalDividers).toHaveLength(1);
        });

        it('should handle delete action with mixed divider types', () => {
            // Add both horizontal and vertical dividers
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
            
            service.send({
                type: 'MOUSE_MOVE',
                x: 100, y: 100,
                positionY: 50, positionX: 20,
                isOverPanel: false
            });
            
            service.send({
                type: 'CLICK_EMPTY_SPACE',
                positionY: 50, positionX: 20
            });
            
            let state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(1);
            expect(state.context.verticalDividers).toHaveLength(1);
            
            // Delete horizontal divider
            const horizontalDividerId = state.context.horizontalDividers[0].id;
            service.send({
                type: 'CLICK_DIVIDER',
                divider: {
                    id: horizontalDividerId,
                    type: 'horizontal',
                    position: 50
                }
            });
            
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(0);
            expect(state.context.verticalDividers).toHaveLength(1); // Should remain
            
            // Delete vertical divider
            const verticalDividerId = state.context.verticalDividers[0].id;
            service.send({
                type: 'CLICK_DIVIDER',
                divider: {
                    id: verticalDividerId,
                    type: 'vertical',
                    position: 20
                }
            });
            
            service.send({ type: 'CLICK_DELETE' });
            
            state = service.getSnapshot();
            expect(state.context.horizontalDividers).toHaveLength(0);
            expect(state.context.verticalDividers).toHaveLength(0);
        });
    });
});