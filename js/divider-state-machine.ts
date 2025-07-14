// @ts-nocheck
import { createMachine, interpret, assign } from 'xstate';
// Create the state machine
export const dividerMachine = createMachine({
    id: 'divider',
    predictableActionArguments: true, // Fix XState warning
    initial: 'normal',
    context: {
        selectedDivider: null,
        hoveredDivider: null,
        dragStartPosition: null,
    },
    states: {
        normal: {
            on: {
                HOVER_DIVIDER: {
                    target: 'hovering',
                    actions: assign({
                        hoveredDivider: (_, event) => event.divider
                    })
                },
                CLICK_EMPTY_SPACE: {
                    actions: 'addDivider' // Action to be implemented
                }
            }
        },
        hovering: {
            on: {
                UNHOVER: {
                    target: 'normal',
                    actions: assign({
                        hoveredDivider: null
                    })
                },
                CLICK_DIVIDER: {
                    target: 'selected',
                    actions: assign({
                        selectedDivider: (_, event) => event.divider,
                        hoveredDivider: null
                    })
                },
                HOVER_DIVIDER: {
                    // Stay in hovering but update the hovered divider
                    actions: assign({
                        hoveredDivider: (_, event) => event.divider
                    })
                }
            }
        },
        selected: {
            on: {
                CLICK_ELSEWHERE: {
                    target: 'normal',
                    actions: assign({
                        selectedDivider: null
                    })
                },
                CLICK_DELETE_BUTTON: {
                    target: 'deleteConfirmation'
                },
                MOUSE_DOWN: {
                    target: 'preparingDrag',
                    actions: assign({
                        dragStartPosition: (_, event) => event.position
                    })
                }
            }
        },
        preparingDrag: {
            on: {
                MOUSE_MOVE_THRESHOLD_EXCEEDED: {
                    target: 'dragging'
                },
                MOUSE_UP: {
                    target: 'selected' // Simple click, back to selected
                }
            }
        },
        dragging: {
            on: {
                MOUSE_UP: {
                    target: 'selected',
                    actions: [
                        'commitDragPosition', // Action to be implemented
                        assign({
                            dragStartPosition: null
                        })
                    ]
                }
            }
        },
        deleteConfirmation: {
            on: {
                CONFIRM_DELETE: {
                    target: 'normal',
                    actions: [
                        'deleteDivider',
                        assign({
                            selectedDivider: null
                        })
                    ]
                },
                CANCEL_DELETE: {
                    target: 'selected'
                },
                CLICK_ELSEWHERE: {
                    target: 'normal',
                    actions: assign({
                        selectedDivider: null
                    })
                }
            }
        }
    }
}, {
    actions: {
        // These will be implemented when we integrate with the existing code
        addDivider: (context, event) => {
            console.log('Action: addDivider', event);
        },
        deleteDivider: (context, event) => {
            console.log('Action: deleteDivider', context.selectedDivider);
        },
        commitDragPosition: (context, event) => {
            console.log('Action: commitDragPosition', context.selectedDivider);
        }
    }
});
// Create a service that can be started with custom actions
export const createDividerService = (customActions = {}) => {
    const machineWithActions = dividerMachine.withConfig({
        actions: {
            ...dividerMachine.config.actions,
            ...customActions
        }
    });
    return interpret(machineWithActions);
};
