import { describe, it, expect, vi } from 'vitest';

describe('Distance Labels Priority Logic Test', () => {
    
    // Extract the core logic we're testing
    function getTargetDivider(context: any) {
        // This is the EXACT logic from shelf-renderer.ts renderDistanceLabels
        return (context.isDragging && context.selectedDivider ? context.selectedDivider : null) ||
            context.hoveredDivider;
    }

    describe('Target divider selection logic', () => {
        it('should prioritize selectedDivider when dragging', () => {
            const context = {
                hoveredDivider: { 
                    id: 'hovered', 
                    position: 50.05279499511798,  // Stale position
                    type: 'horizontal' 
                },
                selectedDivider: { 
                    id: 'selected', 
                    position: 33.22872081313075,  // Live position
                    type: 'horizontal' 
                },
                isDragging: true
            };

            const result = getTargetDivider(context);

            // Should return selectedDivider, not hoveredDivider
            expect(result).toBe(context.selectedDivider);
            expect(result.position).toBe(33.22872081313075);  // Live position
            expect(result.id).toBe('selected');
        });

        it('should use hoveredDivider when not dragging', () => {
            const context = {
                hoveredDivider: { 
                    id: 'hovered', 
                    position: 45.5, 
                    type: 'horizontal' 
                },
                selectedDivider: { 
                    id: 'selected', 
                    position: 30, 
                    type: 'horizontal' 
                },
                isDragging: false
            };

            const result = getTargetDivider(context);

            // Should return hoveredDivider when not dragging
            expect(result).toBe(context.hoveredDivider);
            expect(result.position).toBe(45.5);
            expect(result.id).toBe('hovered');
        });

        it('should use hoveredDivider when dragging but no selectedDivider', () => {
            const context = {
                hoveredDivider: { 
                    id: 'hovered', 
                    position: 60, 
                    type: 'horizontal' 
                },
                selectedDivider: null,
                isDragging: true
            };

            const result = getTargetDivider(context);

            // Should fall back to hoveredDivider
            expect(result).toBe(context.hoveredDivider);
            expect(result.position).toBe(60);
        });

        it('should return null when no dividers available', () => {
            const context = {
                hoveredDivider: null,
                selectedDivider: null,
                isDragging: false
            };

            const result = getTargetDivider(context);
            expect(result).toBeNull();
        });

        it('should handle the exact bug scenario', () => {
            // This reproduces the EXACT browser debug log scenario
            const buggyContext = {
                hoveredDivider: { 
                    id: 'original-hover', 
                    position: 50.05279499511798,  // Stale position from logs
                    type: 'horizontal' 
                },
                selectedDivider: { 
                    id: 'dragged-divider', 
                    position: 34.19654769207955,  // Live position from logs
                    type: 'horizontal' 
                },
                isDragging: true
            };

            const result = getTargetDivider(buggyContext);

            // BEFORE FIX: Would return hoveredDivider (50.05)
            // AFTER FIX: Should return selectedDivider (34.19)
            expect(result.position).toBe(34.19654769207955);  // ✅ Live position
            expect(result.position).not.toBe(50.05279499511798);  // ❌ Stale position
            expect(result.id).toBe('dragged-divider');
        });

        it('should handle multiple drag position updates', () => {
            // Test sequence of positions during drag
            const positions = [40, 35, 30, 25, 20];
            
            positions.forEach((position, index) => {
                const context = {
                    hoveredDivider: { 
                        id: 'stale-hover', 
                        position: 60,  // Always stale
                        type: 'horizontal' 
                    },
                    selectedDivider: { 
                        id: 'dragged', 
                        position: position,  // Live position
                        type: 'horizontal' 
                    },
                    isDragging: true
                };

                const result = getTargetDivider(context);
                
                expect(result.position).toBe(position);  // Should always use live position
                expect(result.position).not.toBe(60);    // Should never use stale position
                expect(result.id).toBe('dragged');
            });
        });

        it('should properly handle edge case transitions', () => {
            const hoveredDivider = { id: 'hover', position: 50, type: 'horizontal' };
            const selectedDivider = { id: 'select', position: 30, type: 'horizontal' };

            // Test all state combinations
            const testCases = [
                { isDragging: false, selectedDivider: null, hoveredDivider, expected: hoveredDivider },
                { isDragging: false, selectedDivider, hoveredDivider, expected: hoveredDivider },
                { isDragging: true, selectedDivider: null, hoveredDivider, expected: hoveredDivider },
                { isDragging: true, selectedDivider, hoveredDivider, expected: selectedDivider },  // Key case!
                { isDragging: false, selectedDivider: null, hoveredDivider: null, expected: null },
                { isDragging: true, selectedDivider: null, hoveredDivider: null, expected: null }
            ];

            testCases.forEach(({ isDragging, selectedDivider, hoveredDivider, expected }, index) => {
                const context = { isDragging, selectedDivider, hoveredDivider };
                const result = getTargetDivider(context);
                
                expect(result).toBe(expected);
            });
        });
    });

    describe('OLD vs NEW logic comparison', () => {
        // This shows what the buggy logic was doing
        function oldBuggyLogic(context: any) {
            // OLD BUGGY VERSION: hoveredDivider took precedence
            return context.hoveredDivider || 
                (context.isDragging && context.selectedDivider ? context.selectedDivider : null);
        }

        // This is our fixed logic
        function newFixedLogic(context: any) {
            // NEW FIXED VERSION: selectedDivider takes precedence during drag
            return (context.isDragging && context.selectedDivider ? context.selectedDivider : null) ||
                context.hoveredDivider;
        }

        it('demonstrates the difference between old and new logic', () => {
            const bugContext = {
                hoveredDivider: { id: 'hover', position: 50, type: 'horizontal' },
                selectedDivider: { id: 'select', position: 30, type: 'horizontal' },
                isDragging: true
            };

            const oldResult = oldBuggyLogic(bugContext);
            const newResult = newFixedLogic(bugContext);

            // OLD LOGIC: Returns hoveredDivider (position 50) - WRONG!
            expect(oldResult.position).toBe(50);
            expect(oldResult.id).toBe('hover');

            // NEW LOGIC: Returns selectedDivider (position 30) - CORRECT!
            expect(newResult.position).toBe(30);
            expect(newResult.id).toBe('select');

            // Verify they are actually different
            expect(oldResult).not.toBe(newResult);
        });

        it('shows both logics work the same when not dragging', () => {
            const context = {
                hoveredDivider: { id: 'hover', position: 50, type: 'horizontal' },
                selectedDivider: { id: 'select', position: 30, type: 'horizontal' },
                isDragging: false
            };

            const oldResult = oldBuggyLogic(context);
            const newResult = newFixedLogic(context);

            // Both should return hoveredDivider when not dragging
            expect(oldResult).toBe(context.hoveredDivider);
            expect(newResult).toBe(context.hoveredDivider);
            expect(oldResult).toBe(newResult);
        });
    });
});