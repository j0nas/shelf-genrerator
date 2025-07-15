// @ts-nocheck
import { createMachine, interpret, assign } from 'xstate';

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
    mousePosition: { x: number; y: number; positionY: number; positionX: number } | null;
    
    // Shelf configuration (for calculations)
    shelfConfig: {
        width: number;
        height: number;
        depth: number;
        materialThickness: number;
        units: 'metric' | 'imperial';
    } | null;
}

// Helper functions for business logic
const createDividerId = () => Date.now().toString();

const calculateNearDistance = (units: string) => units === 'metric' ? 3 : 1.5;

const calculateInteriorWidth = (config: DividerContext['shelfConfig']) => 
    config ? config.width - (2 * config.materialThickness) : 0;

const calculateInteriorHeight = (config: DividerContext['shelfConfig']) => 
    config ? config.height - (2 * config.materialThickness) : 0;

const findDividerById = (dividers: DividerData[], id: string) => 
    dividers.find(d => d.id === id);

const isMouseNearDivider = (
    mousePos: DividerContext['mousePosition'], 
    divider: DividerData, 
    units: string
) => {
    if (!mousePos) return false;
    const nearDistance = calculateNearDistance(units);
    
    if (divider.type === 'horizontal') {
        return Math.abs(mousePos.positionY - divider.position) <= nearDistance;
    } else {
        return Math.abs(mousePos.positionX - divider.position) <= nearDistance;
    }
};

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
            const canAdd = sectionHeight >= minSectionSize * 2;
            
            return {
                position: centerPosition,
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
            const canAdd = sectionWidth >= minSectionSize * 2;
            
            return {
                position: centerPosition,
                positionX: centerPosition,
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
    
    const maxBound = dividerType === 'horizontal' 
        ? calculateInteriorHeight(config)
        : calculateInteriorWidth(config) / 2;
    const minBound = dividerType === 'horizontal' 
        ? 0 
        : -calculateInteriorWidth(config) / 2;
    
    const otherDividers = dividers.filter(d => d.id !== dividerId && d.type === dividerType);
    const minGap = config.units === 'metric' ? 2 : 0.75;
    
    let constrainedPosition = Math.max(minBound + minGap, Math.min(maxBound - minGap, position));
    
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
    
    return Math.max(minBound + minGap, Math.min(maxBound - minGap, constrainedPosition));
};

// The comprehensive state machine
export const dividerStateMachine = createMachine<DividerContext>({
    id: 'dividerSystem',
    predictableActionArguments: true,
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
                    actions: ['updateMousePosition', 'updateGhostDivider', 'checkHover']
                },
                CLICK_EMPTY_SPACE: [
                    {
                        cond: 'canAddDivider',
                        actions: 'addDivider'
                    }
                ],
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
            on: {
                MOUSE_MOVE: {
                    actions: ['updateMousePosition', 'updateGhostDivider', 'checkHover']
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
                }
            }
        },
        selected: {
            entry: 'hideGhostDivider',
            on: {
                MOUSE_MOVE: {
                    actions: 'updateMousePosition'
                },
                MOUSE_DOWN: {
                    target: 'preparingDrag',
                    actions: 'prepareDrag'
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
                }
            }
        },
        preparingDrag: {
            on: {
                MOUSE_MOVE: [
                    {
                        cond: 'dragThresholdExceeded',
                        target: 'dragging',
                        actions: 'startDrag'
                    },
                    {
                        actions: 'updateMousePosition'
                    }
                ],
                MOUSE_UP: {
                    target: 'selected'
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
                    target: 'selected',
                    actions: 'commitDrag'
                }
            }
        }
    }
}, {
    guards: {
        canAddDivider: (context, event) => {
            return context.ghostDivider?.canAdd === true;
        },
        dragThresholdExceeded: (context, event) => {
            if (!context.dragStartPosition || !context.mousePosition) return false;
            const dx = context.mousePosition.x - context.dragStartPosition.x;
            const dy = context.mousePosition.y - context.dragStartPosition.y;
            return Math.sqrt(dx * dx + dy * dy) > 5;
        }
    },
    actions: {
        updateShelfConfig: assign({
            shelfConfig: (_, event) => event.config
        }),
        
        updateMousePosition: assign({
            mousePosition: (_, event) => ({
                x: event.x,
                y: event.y,
                positionY: event.positionY,
                positionX: event.positionX
            })
        }),
        
        updateGhostDivider: assign({
            ghostDivider: (context) => {
                if (context.selectedDivider) return null; // No ghost when selected
                
                return detectGhostDivider(
                    context.mousePosition,
                    context.horizontalDividers,
                    context.verticalDividers,
                    context.shelfConfig
                );
            }
        }),
        
        checkHover: assign({
            hoveredDivider: (context) => {
                if (!context.mousePosition || !context.shelfConfig) return null;
                
                // Check all dividers for proximity
                const allDividers = [...context.horizontalDividers, ...context.verticalDividers];
                
                for (const divider of allDividers) {
                    if (isMouseNearDivider(context.mousePosition, divider, context.shelfConfig.units)) {
                        return divider;
                    }
                }
                
                return null;
            }
        }),
        
        setHoveredDivider: assign({
            hoveredDivider: (_, event) => event.divider
        }),
        
        clearHover: assign({
            hoveredDivider: null
        }),
        
        selectDivider: assign({
            selectedDivider: (_, event) => event.divider,
            hoveredDivider: null
        }),
        
        clearSelection: assign({
            selectedDivider: null,
            hoveredDivider: null
        }),
        
        hideGhostDivider: assign({
            ghostDivider: null
        }),
        
        addDivider: assign((context, event) => {
            if (!context.ghostDivider) return context;
            
            const newDivider: DividerData = {
                id: createDividerId(),
                position: context.ghostDivider.type === 'vertical' 
                    ? context.ghostDivider.positionX! 
                    : context.ghostDivider.position,
                type: context.ghostDivider.type
            };
            
            if (context.ghostDivider.type === 'horizontal') {
                return {
                    ...context,
                    horizontalDividers: [...context.horizontalDividers, newDivider],
                    ghostDivider: null
                };
            } else {
                return {
                    ...context,
                    verticalDividers: [...context.verticalDividers, newDivider],
                    ghostDivider: null
                };
            }
        }),
        
        prepareDrag: assign({
            dragStartPosition: (_, event) => ({ x: event.x, y: event.y }),
            dragStartDividerPosition: (context) => context.selectedDivider?.position || null
        }),
        
        startDrag: assign({
            isDragging: true
        }),
        
        updateDragPosition: assign((context, event) => {
            if (!context.selectedDivider || !context.mousePosition) return context;
            
            const newPosition = context.selectedDivider.type === 'horizontal' 
                ? context.mousePosition.positionY 
                : context.mousePosition.positionX;
            
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
                    ...context,
                    selectedDivider: updatedDivider,
                    horizontalDividers: context.horizontalDividers.map(d => 
                        d.id === updatedDivider.id ? updatedDivider : d
                    )
                };
            } else {
                return {
                    ...context,
                    selectedDivider: updatedDivider,
                    verticalDividers: context.verticalDividers.map(d => 
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
        
        deleteDivider: assign((context) => {
            if (!context.selectedDivider) return context;
            
            if (context.selectedDivider.type === 'horizontal') {
                return {
                    ...context,
                    horizontalDividers: context.horizontalDividers.filter(d => d.id !== context.selectedDivider!.id),
                    selectedDivider: null
                };
            } else {
                return {
                    ...context,
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
        
        addExistingDivider: assign((context, event) => {
            const divider = event.divider;
            
            if (divider.type === 'horizontal') {
                return {
                    ...context,
                    horizontalDividers: [...context.horizontalDividers, divider]
                };
            } else {
                return {
                    ...context,
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

export const createDividerSystemService = () => interpret(dividerStateMachine);