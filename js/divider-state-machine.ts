import { createMachine, createActor, assign } from 'xstate';

// Types for our state machine
interface DividerData {
    id: string;
    position: number; // Y for horizontal, X for vertical
    type: 'horizontal' | 'vertical';
}

interface GhostDivider {
    position: number;
    positionX?: number; // For vertical ghosts
    type: 'horizontal' | 'vertical';
    canAdd: boolean;
    visible: boolean;
}

interface DividerContext {
    // All divider data
    horizontalDividers: DividerData[];
    verticalDividers: DividerData[];
    
    // Interaction state
    selectedDivider: DividerData | null;
    hoveredDivider: DividerData | null;
    
    // Ghost divider state
    ghostDivider: GhostDivider | null;
    
    // Drag state
    isDragging: boolean;
    dragStartPosition: { x: number; y: number } | null;
    dragStartDividerPosition: number | null;
    
    // Mouse state
    mousePosition: { x: number; y: number; positionY: number; positionX: number; isOverPanel?: boolean } | null;
    
    // Shelf configuration (for calculations)
    shelfConfig: {
        width: number;
        height: number;
        depth: number;
        materialThickness: number;
        units: 'metric' | 'imperial';
    } | null;
}

// Event types for XState v5
type DividerEvent = 
    | { type: 'MOUSE_MOVE'; x: number; y: number; positionY: number; positionX: number; isOverPanel?: boolean }
    | { type: 'CLICK_EMPTY_SPACE'; positionY: number; positionX: number }
    | { type: 'CLICK_DIVIDER'; divider: DividerData }
    | { type: 'HOVER_DIVIDER'; divider: DividerData }
    | { type: 'UNHOVER' }
    | { type: 'MOUSE_DOWN'; x: number; y: number }
    | { type: 'MOUSE_UP' }
    | { type: 'CLICK_DELETE' }
    | { type: 'CLICK_ELSEWHERE' }
    | { type: 'UPDATE_SHELF_CONFIG'; config: DividerContext['shelfConfig'] }
    | { type: 'ADD_EXISTING_DIVIDER'; divider: DividerData }
    | { type: 'RESET' };

// Helper functions for business logic
let dividerIdCounter = 0;
const createDividerId = () => `divider-${++dividerIdCounter}-${Date.now()}`;

const calculateInteriorWidth = (config: DividerContext['shelfConfig']) => 
    config ? config.width - (2 * config.materialThickness) : 0;

const calculateInteriorHeight = (config: DividerContext['shelfConfig']) => 
    config ? config.height - (2 * config.materialThickness) : 0;

const detectGhostDivider = (
    mousePos: DividerContext['mousePosition'],
    horizontalDividers: DividerData[],
    verticalDividers: DividerData[],
    config: DividerContext['shelfConfig']
): GhostDivider | null => {
    if (!mousePos || !config) return null;
    
    const interiorHeight = calculateInteriorHeight(config);
    const interiorWidth = calculateInteriorWidth(config);
    const minSectionSize = config.units === 'metric' ? 8 : 3;
    
    // Intelligent prioritization based on mouse position
    const normalizedX = mousePos.positionX / (interiorWidth / 2); // -1 to 1
    const preferVertical = normalizedX < -0.4 || normalizedX > 0.4;
    
    if (preferVertical) {
        // Try vertical first when near edges
        const verticalGhost = detectVerticalGhost(mousePos, verticalDividers, config, minSectionSize);
        if (verticalGhost) return verticalGhost;
    }
    
    // Try horizontal (default behavior)
    const horizontalGhost = detectHorizontalGhost(mousePos, horizontalDividers, config, minSectionSize);
    if (horizontalGhost) return horizontalGhost;
    
    // Fallback to vertical if horizontal not possible
    if (!preferVertical) {
        const verticalGhost = detectVerticalGhost(mousePos, verticalDividers, config, minSectionSize);
        if (verticalGhost) return verticalGhost;
    }
    
    return null;
};

const detectHorizontalGhost = (
    mousePos: DividerContext['mousePosition'],
    dividers: DividerData[],
    config: DividerContext['shelfConfig'],
    minSectionSize: number
): GhostDivider | null => {
    if (!mousePos || !config) return null;
    
    const interiorHeight = calculateInteriorHeight(config);
    const sortedDividers = [...dividers].sort((a, b) => a.position - b.position);
    
    // Find which section the mouse is in
    for (let i = 0; i <= sortedDividers.length; i++) {
        const bottomBound = i === 0 ? 0 : sortedDividers[i - 1].position;
        const topBound = i === sortedDividers.length ? interiorHeight : sortedDividers[i].position;
        
        if (mousePos.positionY >= bottomBound && mousePos.positionY <= topBound) {
            const sectionHeight = topBound - bottomBound;
            const centerPosition = bottomBound + (sectionHeight / 2);
            
            // Check section size and collision with boundaries
            const sectionSizeOk = sectionHeight >= minSectionSize * 2;
            const minGap = config.units === 'metric' ? 2 : 0.75;
            
            // Check if mouse position would be too close to existing dividers
            const tooCloseToBottom = i === 0 ? false : (mousePos.positionY - bottomBound) < minGap;
            const tooCloseToTop = i === sortedDividers.length ? false : (topBound - mousePos.positionY) < minGap;
            
            const canAdd = sectionSizeOk && !tooCloseToBottom && !tooCloseToTop;
            
            return {
                position: mousePos.positionY,
                type: 'horizontal',
                canAdd,
                visible: canAdd
            };
        }
    }
    
    return null;
};

const detectVerticalGhost = (
    mousePos: DividerContext['mousePosition'],
    dividers: DividerData[],
    config: DividerContext['shelfConfig'],
    minSectionSize: number
): GhostDivider | null => {
    if (!mousePos || !config) return null;
    
    const interiorWidth = calculateInteriorWidth(config);
    const sortedDividers = [...dividers].sort((a, b) => a.position - b.position);
    
    // Find which section the mouse is in
    for (let i = 0; i <= sortedDividers.length; i++) {
        const leftBound = i === 0 ? -interiorWidth/2 : sortedDividers[i - 1].position;
        const rightBound = i === sortedDividers.length ? interiorWidth/2 : sortedDividers[i].position;
        
        if (mousePos.positionX >= leftBound && mousePos.positionX <= rightBound) {
            const sectionWidth = rightBound - leftBound;
            const centerPosition = leftBound + (sectionWidth / 2);
            
            // Check section size and collision with boundaries
            const sectionSizeOk = sectionWidth >= minSectionSize * 2;
            const minGap = config.units === 'metric' ? 2 : 0.75;
            
            // Check if mouse position would be too close to existing dividers
            const tooCloseToLeft = i === 0 ? false : (mousePos.positionX - leftBound) < minGap;
            const tooCloseToRight = i === sortedDividers.length ? false : (rightBound - mousePos.positionX) < minGap;
            
            const canAdd = sectionSizeOk && !tooCloseToLeft && !tooCloseToRight;
            
            return {
                position: mousePos.positionX,
                positionX: mousePos.positionX,
                type: 'vertical',
                canAdd,
                visible: canAdd
            };
        }
    }
    
    return null;
};

const constrainDividerPosition = (
    position: number,
    dividerType: 'horizontal' | 'vertical',
    dividerId: string,
    dividers: DividerData[],
    config: DividerContext['shelfConfig']
): number => {
    if (!config) return position;
    
    const thickness = config.materialThickness;
    const maxBound = dividerType === 'horizontal' 
        ? calculateInteriorHeight(config) - thickness / 2
        : calculateInteriorWidth(config) / 2 - thickness / 2;
    const minBound = dividerType === 'horizontal' 
        ? thickness / 2
        : -calculateInteriorWidth(config) / 2 + thickness / 2;
    
    const otherDividers = dividers.filter(d => d.id !== dividerId && d.type === dividerType);
    const minGap = config.units === 'metric' ? 2 : 0.75;
    
    let constrainedPosition = Math.max(minBound, Math.min(maxBound, position));
    
    // Avoid collisions with other dividers
    for (const other of otherDividers) {
        if (Math.abs(constrainedPosition - other.position) < minGap) {
            if (constrainedPosition < other.position) {
                constrainedPosition = other.position - minGap;
            } else {
                constrainedPosition = other.position + minGap;
            }
        }
    }
    
    return Math.max(minBound, Math.min(maxBound, constrainedPosition));
};

// The comprehensive state machine
export const dividerStateMachine = createMachine({
    types: {} as {
        context: DividerContext;
        events: DividerEvent;
    },
    id: 'dividerSystem',
    initial: 'normal',
    context: {
        horizontalDividers: [],
        verticalDividers: [],
        selectedDivider: null,
        hoveredDivider: null,
        ghostDivider: null,
        isDragging: false,
        dragStartPosition: null,
        dragStartDividerPosition: null,
        mousePosition: null,
        shelfConfig: null,
    },
    states: {
        normal: {
            entry: 'clearSelection',
            on: {
                MOUSE_MOVE: {
                    actions: ['updateMousePosition', 'updateGhostDivider']
                },
                CLICK_EMPTY_SPACE: [
                    {
                        guard: 'canAddDivider',
                        actions: 'addDivider'
                    }
                ],
                CLICK_DIVIDER: {
                    target: 'selected',
                    actions: 'selectDivider'
                },
                HOVER_DIVIDER: {
                    target: 'hovering',
                    actions: 'setHoveredDivider'
                },
                UPDATE_SHELF_CONFIG: {
                    actions: 'updateShelfConfig'
                },
                ADD_EXISTING_DIVIDER: {
                    actions: 'addExistingDivider'
                },
                RESET: {
                    target: 'normal',
                    actions: 'resetSystem'
                }
            }
        },
        hovering: {
            entry: 'hideGhostDivider',
            on: {
                MOUSE_MOVE: {
                    actions: ['updateMousePosition']
                },
                MOUSE_DOWN: {
                    target: 'preparingDrag',
                    actions: ['selectHoveredDivider', 'prepareDrag']
                },
                CLICK_DIVIDER: {
                    target: 'selected',
                    actions: 'selectDivider'
                },
                UNHOVER: {
                    target: 'normal',
                    actions: 'clearHover'
                },
                UPDATE_SHELF_CONFIG: {
                    actions: 'updateShelfConfig'
                },
                RESET: {
                    target: 'normal',
                    actions: 'resetSystem'
                }
            }
        },
        selected: {
            entry: 'hideGhostDivider',
            on: {
                MOUSE_MOVE: {
                    actions: ['updateMousePosition']
                },
                MOUSE_DOWN: {
                    target: 'preparingDrag',
                    actions: 'prepareDrag'
                },
                CLICK_DIVIDER: {
                    actions: 'selectDivider'
                },
                HOVER_DIVIDER: {
                    actions: 'setHoveredDivider'
                },
                UNHOVER: {
                    actions: 'clearHover'
                },
                CLICK_DELETE: {
                    target: 'normal',
                    actions: 'deleteDivider'
                },
                CLICK_ELSEWHERE: {
                    target: 'normal',
                    actions: 'clearSelection'
                },
                UPDATE_SHELF_CONFIG: {
                    actions: 'updateShelfConfig'
                },
                RESET: {
                    target: 'normal',
                    actions: 'resetSystem'
                }
            }
        },
        preparingDrag: {
            on: {
                MOUSE_MOVE: [
                    {
                        guard: 'dragThresholdExceeded',
                        target: 'dragging',
                        actions: ['updateMousePosition', 'startDrag']
                    },
                    {
                        actions: 'updateMousePosition'
                    }
                ],
                MOUSE_UP: {
                    target: 'selected'
                },
                RESET: {
                    target: 'normal',
                    actions: 'resetSystem'
                }
            }
        },
        dragging: {
            entry: 'disableCameraControls',
            exit: 'enableCameraControls',
            on: {
                MOUSE_MOVE: {
                    actions: ['updateMousePosition', 'updateDragPosition']
                },
                MOUSE_UP: {
                    target: 'normal',
                    actions: ['commitDrag', 'clearSelection']
                },
                RESET: {
                    target: 'normal',
                    actions: 'resetSystem'
                }
            }
        }
    }
}, {
    guards: {
        canAddDivider: ({ context }) => {
            return context.ghostDivider?.canAdd === true;
        },
        dragThresholdExceeded: ({ context, event }) => {
            if (!context.dragStartPosition || !('x' in event) || !('y' in event)) return false;
            const dx = event.x - context.dragStartPosition.x;
            const dy = event.y - context.dragStartPosition.y;
            return Math.sqrt(dx * dx + dy * dy) > 5;
        }
    },
    actions: {
        updateShelfConfig: assign({
            shelfConfig: ({ event }) => event.type === 'UPDATE_SHELF_CONFIG' ? event.config : null
        }),
        
        updateMousePosition: assign({
            mousePosition: ({ event }) => {
                if (event.type === 'MOUSE_MOVE') {
                    return {
                        x: event.x,
                        y: event.y,
                        positionY: event.positionY,
                        positionX: event.positionX,
                        isOverPanel: event.isOverPanel || false
                    };
                }
                return null;
            }
        }),
        
        updateGhostDivider: assign({
            ghostDivider: ({ context }) => {
                if (context.selectedDivider) return null; // No ghost when selected
                if (context.mousePosition?.isOverPanel) return null; // No ghost when over panels
                
                return detectGhostDivider(
                    context.mousePosition,
                    context.horizontalDividers,
                    context.verticalDividers,
                    context.shelfConfig
                );
            }
        }),
        
        
        setHoveredDivider: assign({
            hoveredDivider: ({ event }) => event.type === 'HOVER_DIVIDER' ? event.divider : null
        }),
        
        clearHover: assign({
            hoveredDivider: null
        }),
        
        selectDivider: assign({
            selectedDivider: ({ event }) => event.type === 'CLICK_DIVIDER' ? event.divider : null,
            hoveredDivider: null
        }),
        
        selectHoveredDivider: assign({
            selectedDivider: ({ context }) => context.hoveredDivider,
            hoveredDivider: null
        }),
        
        clearSelection: assign({
            selectedDivider: null,
            hoveredDivider: null
        }),
        
        hideGhostDivider: assign({
            ghostDivider: null
        }),
        
        addDivider: assign(({ context }) => {
            if (!context.ghostDivider) return {};
            
            const rawPosition = context.ghostDivider.type === 'vertical' 
                ? context.ghostDivider.positionX! 
                : context.ghostDivider.position;
            
            // Apply position constraints when creating the divider
            const allDividers = [...context.horizontalDividers, ...context.verticalDividers];
            const constrainedPosition = constrainDividerPosition(
                rawPosition,
                context.ghostDivider.type,
                createDividerId(), // temporary ID for constraint check
                allDividers,
                context.shelfConfig
            );
            
            const newDivider: DividerData = {
                id: createDividerId(),
                position: constrainedPosition,
                type: context.ghostDivider.type
            };
            
            if (context.ghostDivider.type === 'horizontal') {
                return {
                    horizontalDividers: [...context.horizontalDividers, newDivider],
                    ghostDivider: null
                };
            } else {
                return {
                    verticalDividers: [...context.verticalDividers, newDivider],
                    ghostDivider: null
                };
            }
        }),
        
        prepareDrag: assign({
            dragStartPosition: ({ event }) => {
                if (event.type === 'MOUSE_DOWN') {
                    return { x: event.x, y: event.y };
                }
                return null;
            },
            dragStartDividerPosition: ({ context }) => context.selectedDivider?.position || null
        }),
        
        startDrag: assign({
            isDragging: true
        }),
        
        updateDragPosition: assign(({ context, event }) => {
            if (!context.selectedDivider || event.type !== 'MOUSE_MOVE') return {};
            
            const newPosition = context.selectedDivider.type === 'horizontal' 
                ? event.positionY 
                : event.positionX;
            
            const allDividers = context.selectedDivider.type === 'horizontal' 
                ? context.horizontalDividers 
                : context.verticalDividers;
            
            const constrainedPosition = constrainDividerPosition(
                newPosition,
                context.selectedDivider.type,
                context.selectedDivider.id,
                allDividers,
                context.shelfConfig
            );
            
            const updatedDivider = { ...context.selectedDivider, position: constrainedPosition };
            
            if (context.selectedDivider.type === 'horizontal') {
                return {
                    selectedDivider: updatedDivider,
                    horizontalDividers: context.horizontalDividers.map((d: DividerData) => 
                        d.id === updatedDivider.id ? updatedDivider : d
                    )
                };
            } else {
                return {
                    selectedDivider: updatedDivider,
                    verticalDividers: context.verticalDividers.map((d: DividerData) => 
                        d.id === updatedDivider.id ? updatedDivider : d
                    )
                };
            }
        }),
        
        commitDrag: assign({
            isDragging: false,
            dragStartPosition: null,
            dragStartDividerPosition: null
        }),
        
        deleteDivider: assign(({ context }) => {
            if (!context.selectedDivider) return {};
            
            if (context.selectedDivider.type === 'horizontal') {
                return {
                    horizontalDividers: context.horizontalDividers.filter(d => d.id !== context.selectedDivider!.id),
                    selectedDivider: null
                };
            } else {
                return {
                    verticalDividers: context.verticalDividers.filter(d => d.id !== context.selectedDivider!.id),
                    selectedDivider: null
                };
            }
        }),
        
        disableCameraControls: () => {
            // Will be implemented by the view layer
        },
        
        enableCameraControls: () => {
            // Will be implemented by the view layer
        },
        
        
        addExistingDivider: assign(({ context, event }) => {
            if (event.type !== 'ADD_EXISTING_DIVIDER') return {};
            
            const divider = event.divider;
            
            if (divider.type === 'horizontal') {
                return {
                    horizontalDividers: [...context.horizontalDividers, divider]
                };
            } else {
                return {
                    verticalDividers: [...context.verticalDividers, divider]
                };
            }
        }),
        
        resetSystem: assign({
            horizontalDividers: [],
            verticalDividers: [],
            selectedDivider: null,
            hoveredDivider: null,
            ghostDivider: null,
            isDragging: false,
            dragStartPosition: null,
            dragStartDividerPosition: null,
            mousePosition: null
        })
    }
});

export const createDividerSystemService = () => createActor(dividerStateMachine);