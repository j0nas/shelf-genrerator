// @ts-nocheck
// Pure input controller - converts DOM events to state machine events
export class InputController {
    private renderer: any;
    private stateMachine: any;
    private justFinishedDragging = false;
    
    constructor(renderer: any, stateMachine: any) {
        this.renderer = renderer;
        this.stateMachine = stateMachine;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const canvas = this.renderer.renderer.domElement;
        
        canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        canvas.addEventListener('click', (event) => this.onClick(event));
        canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
    }
    
    onMouseMove(event: MouseEvent) {
        const mousePos = this.renderer.getMousePosition(event);
        const intersection = this.renderer.getShelfIntersection(mousePos.x, mousePos.y);
        
        if (!intersection) return;
        
        // Check if hovering over existing divider
        const dividerAtMouse = this.renderer.getDividerAtPosition(mousePos.x, mousePos.y);
        
        if (dividerAtMouse) {
            this.stateMachine.send({
                type: 'HOVER_DIVIDER',
                divider: {
                    id: dividerAtMouse.id,
                    type: dividerAtMouse.type,
                    position: dividerAtMouse.position
                }
            });
        } else {
            this.stateMachine.send({ type: 'UNHOVER' });
        }
        
        // Always send mouse position for drag and ghost calculations
        this.stateMachine.send({
            type: 'MOUSE_MOVE',
            x: event.clientX,
            y: event.clientY,
            positionY: intersection.positionY,
            positionX: intersection.positionX
        });
    }
    
    onClick(event: MouseEvent) {
        // Ignore clicks immediately after dragging
        if (this.justFinishedDragging) {
            this.justFinishedDragging = false;
            return;
        }
        
        const mousePos = this.renderer.getMousePosition(event);
        const intersection = this.renderer.getShelfIntersection(mousePos.x, mousePos.y);
        
        if (!intersection) return;
        
        // Check if clicking on divider
        const dividerAtMouse = this.renderer.getDividerAtPosition(mousePos.x, mousePos.y);
        
        if (dividerAtMouse) {
            this.stateMachine.send({
                type: 'CLICK_DIVIDER',
                divider: {
                    id: dividerAtMouse.id,
                    type: dividerAtMouse.type,
                    position: dividerAtMouse.position
                }
            });
        } else {
            // Check if clicking on delete button (if selected)
            const currentState = this.stateMachine.getSnapshot();
            if (currentState.value === 'selected' && this.isDeleteButtonClick(event)) {
                this.stateMachine.send({ type: 'CLICK_DELETE' });
                return;
            }
            
            // Clicking on empty space
            if (currentState.value === 'selected') {
                this.stateMachine.send({ type: 'CLICK_ELSEWHERE' });
            } else {
                this.stateMachine.send({
                    type: 'CLICK_EMPTY_SPACE',
                    positionY: intersection.positionY,
                    positionX: intersection.positionX
                });
            }
        }
    }
    
    onMouseDown(event: MouseEvent) {
        const currentState = this.stateMachine.getSnapshot();
        
        if (currentState.value === 'selected') {
            this.stateMachine.send({
                type: 'MOUSE_DOWN',
                x: event.clientX,
                y: event.clientY
            });
        }
    }
    
    onMouseUp(event: MouseEvent) {
        const currentState = this.stateMachine.getSnapshot();
        
        if (currentState.value === 'dragging') {
            this.justFinishedDragging = true;
            // Clear the flag after a short delay
            setTimeout(() => {
                this.justFinishedDragging = false;
            }, 100);
        }
        
        this.stateMachine.send({ type: 'MOUSE_UP' });
    }
    
    private isDeleteButtonClick(event: MouseEvent): boolean {
        // TODO: Implement delete button detection
        // For now, we can use keyboard shortcut or right-click
        return event.button === 2; // Right click
    }
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            const currentState = this.stateMachine.getSnapshot();
            
            switch (event.key) {
                case 'Delete':
                case 'Backspace':
                    if (currentState.value === 'selected') {
                        this.stateMachine.send({ type: 'CLICK_DELETE' });
                    }
                    break;
                case 'Escape':
                    if (currentState.value === 'selected') {
                        this.stateMachine.send({ type: 'CLICK_ELSEWHERE' });
                    }
                    break;
            }
        });
    }
}