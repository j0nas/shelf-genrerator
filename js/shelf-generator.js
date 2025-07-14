import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDividerService } from '../dist/js/divider-state-machine.js';

export class ShelfGenerator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.shelfGroup = null;
        this.container = null;
        
        // 3D Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentConfig = null;
        this.debugMode = false;
        this.debugSphere = null;
        this.ghostDivider = null;
        this.hoveredDivider = null;
        
        // Legacy state management (being phased out for XState)
        this.interactionState = 'NORMAL';
        this.selectedDivider = null;
        this.isDragging = false;
        this.dragStartPosition = null;
        this.measurementOverlays = [];
        this.deleteButton = null;
        this.deleteButtonHovered = false;
        this.processingClick = false;
        this.justDeleted = false;
        this.justDeselected = false;
        this.readyToDrag = false;
        
        // Initialize XState service for robust state management
        this.stateMachine = createDividerService();
        this.setupStateMachine();
    }
    
    setupStateMachine() {
        // Configure state machine actions to connect with existing functionality
        this.stateMachine.machine.config.actions = {
            addDivider: (context, event) => {
                console.log('XState Action: addDivider', event.position);
                const app = window.app;
                if (app && event.position) {
                    app.addDividerAtPosition(event.position);
                }
            },
            deleteDivider: (context, event) => {
                console.log('XState Action: deleteDivider', context.selectedDivider);
                const app = window.app;
                if (app && context.selectedDivider) {
                    app.removeDivider(context.selectedDivider.dividerId);
                }
            },
            commitDragPosition: (context, event) => {
                console.log('XState Action: commitDragPosition', context.selectedDivider);
                
                // Re-enable camera controls
                const shelfGenerator = window.shelfGenerator;
                if (shelfGenerator) {
                    shelfGenerator.controls.enabled = true;
                }
                
                // Commit the position change to the app state
                const app = window.app;
                if (app && context.selectedDivider) {
                    app.updateDivider(context.selectedDivider.dividerId, 'position', context.selectedDivider.position);
                }
                
                // Reset drag state in legacy system
                if (shelfGenerator) {
                    shelfGenerator.interactionState = 'SELECTED';
                    shelfGenerator.isDragging = false;
                    shelfGenerator.dragStartPosition = null;
                }
            }
        };
        
        // Log state transitions for debugging
        this.stateMachine.onTransition((state, event) => {
            console.log(`🎯 XState: ${state.value} <- ${event.type}`);
            if (this.debugMode) {
                console.log('Context:', state.context);
            }
            
            // Auto-confirm delete for now (can add UI confirmation later)
            if (state.value === 'deleteConfirmation') {
                console.log('Auto-confirming delete...');
                setTimeout(() => {
                    this.stateMachine.send({ type: 'CONFIRM_DELETE' });
                }, 100); // Small delay to let user see the transition
            }
        });
        
        // Start the state machine
        this.stateMachine.start();
        
        console.log('✅ XState divider state machine initialized');
    }
    
    // Helper methods to get state from XState (preferred over legacy state)
    getCurrentState() {
        return this.stateMachine.getSnapshot?.()?.value || this.stateMachine.state?.value || 'normal';
    }
    
    getSelectedDivider() {
        const snapshot = this.stateMachine.getSnapshot?.() || this.stateMachine.state;
        return snapshot?.context?.selectedDivider || null;
    }
    
    getHoveredDivider() {
        const snapshot = this.stateMachine.getSnapshot?.() || this.stateMachine.state;
        return snapshot?.context?.hoveredDivider || null;
    }
    
    isDragging() {
        return this.getCurrentState() === 'dragging';
    }
    
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container element not found:', containerId);
            return;
        }
        
        // Make this instance globally accessible for XState actions
        window.shelfGenerator = this;
        
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.setup3DInteraction();
        this.animate();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f8ff);
        
        this.shelfGroup = new THREE.Group();
        this.scene.add(this.shelfGroup);
        
        const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc);
        gridHelper.position.y = -0.1;
        this.scene.add(gridHelper);
    }
    
    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(50, 50, 50);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
    }
    
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Smooth damping
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        
        // MUCH better panning
        this.controls.screenSpacePanning = true; // This is key!
        this.controls.panSpeed = 1.0;
        
        // Zoom settings
        this.controls.minDistance = 10;
        this.controls.maxDistance = 200;
        this.controls.zoomSpeed = 0.3; // Much less sensitive zooming
        
        // Rotation settings  
        this.controls.rotateSpeed = 0.8;
        this.controls.maxPolarAngle = Math.PI / 2; // Prevent going below ground
        
        // Key bindings for better control
        this.controls.keys = {
            LEFT: 'ArrowLeft',   // Arrow keys to pan
            UP: 'ArrowUp',
            RIGHT: 'ArrowRight', 
            BOTTOM: 'ArrowDown'
        };
        
        // Mouse bindings
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,     // Left drag = rotate
            MIDDLE: THREE.MOUSE.DOLLY,    // Middle = zoom
            RIGHT: THREE.MOUSE.PAN        // Right drag = pan (much smoother!)
        };
        
        // Touch settings for mobile
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,      // One finger = rotate
            TWO: THREE.TOUCH.DOLLY_PAN    // Two finger = zoom + pan
        };
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
        
        const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
        light2.position.set(-25, 25, -25);
        this.scene.add(light2);
    }
    
    setup3DInteraction() {
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.renderer.domElement.addEventListener('mouseup', (event) => this.onMouseUp(event));
    }
    
    onMouseMove(event) {
        if (!this.currentConfig) return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Handle different interaction states
        if (this.interactionState === 'DRAGGING') {
            this.handleDragMove(event);
            return;
        }
        
        // Check if we should start dragging (mouse down on selected divider + movement)
        if (this.readyToDrag && this.dragStartPosition) {
            const currentMouseX = event.clientX - rect.left;
            const currentMouseY = event.clientY - rect.top;
            const deltaX = currentMouseX - this.dragStartPosition.x;
            const deltaY = currentMouseY - this.dragStartPosition.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Only start drag if mouse moved more than a small threshold (5 pixels)
            if (distance > 5) {
                console.log('Mouse moved', distance.toFixed(1), 'pixels - starting drag now');
                this.readyToDrag = false; // Don't check again
                
                // DUAL MODE: Send to XState
                this.stateMachine.send({ type: 'MOUSE_MOVE_THRESHOLD_EXCEEDED' });
                this.startDrag(event);
                return;
            }
        }
        
        // Check for delete button hover first
        this.updateDeleteButtonHover();
        
        // First check if we're hovering over existing divider geometry
        const existingDivider = this.detectHoveredExistingDivider();
        
        if (existingDivider) {
            // DUAL MODE: Update both legacy state and XState during migration
            
            // Legacy state management (keep for now)
            if (this.selectedDivider && existingDivider.dividerId === this.selectedDivider.dividerId) {
                this.interactionState = 'SELECTED';
            } else {
                this.interactionState = 'HOVERING';
                this.hoveredDivider = existingDivider;
                this.updateHoverState(existingDivider);
            }
            
            // NEW: Send event to XState
            this.stateMachine.send({ 
                type: 'HOVER_DIVIDER', 
                divider: existingDivider 
            });
            
            this.hideGhostDivider();
            
            if (this.debugMode) {
                console.log('Hovering existing divider:', existingDivider, 'State:', this.interactionState);
            }
        } else {
            // Not hovering existing divider
            if (this.interactionState !== 'SELECTED') {
                this.interactionState = 'NORMAL';
                this.clearHoverState();
                
                // NEW: Send UNHOVER event to XState
                this.stateMachine.send({ type: 'UNHOVER' });
                
                // Check for ghost divider position
                const result = this.getShelfInteriorIntersection();
                if (result !== null) {
                    if (this.debugMode) {
                        const unit = result.units === 'metric' ? 'cm' : '"';
                        console.log(`Shelf interior Y position: ${result.position.toFixed(2)}${unit} from bottom`);
                        this.updateDebugVisualization(result.worldPoint);
                    }
                    
                    // Smart section detection and ghost divider
                    const sectionInfo = this.detectHoveredSection(result.position);
                    if (this.debugMode) {
                        console.log('Section info:', sectionInfo);
                    }
                    this.updateGhostDivider(sectionInfo);
                } else {
                    if (this.debugMode) {
                        this.hideDebugVisualization();
                    }
                    this.hideGhostDivider();
                }
            }
        }
    }
    
    onMouseClick(event) {
        if (!this.currentConfig) return;
        
        const app = window.app;
        if (!app) return;
        
        // Update raycaster with current mouse position for this click
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        console.log(`Click event - Current state: ${this.interactionState}`);
        
        // Handle selected divider clicks
        if (this.interactionState === 'SELECTED') {
            console.log('In SELECTED state - checking what was clicked');
            
            // Safety check: Make sure we still have a selected divider
            if (!this.selectedDivider) {
                console.log('No selected divider found - switching to normal state');
                this.interactionState = 'NORMAL';
                return;
            }
            
            // FIRST: Check if delete button is clicked 
            if (this.deleteButton) {
                const deleteButtonClicked = this.checkDeleteButtonClick();
                if (deleteButtonClicked) {
                    console.log('Delete button clicked - deleting divider');
                    
                    // XState handles the deletion now
                    this.stateMachine.send({ type: 'CLICK_DELETE_BUTTON' });
                    return; // Exit immediately after deletion
                }
            }
            
            // Check if clicking on the selected divider itself (for future drag preparation)
            const clickedDivider = this.detectHoveredExistingDivider();
            if (clickedDivider && this.selectedDivider && clickedDivider.dividerId === this.selectedDivider.dividerId) {
                console.log('Clicked on selected divider itself - staying selected');
                return;
            }
            
            // Clicking elsewhere - deselect
            console.log('Clicking elsewhere while divider selected - deselecting');
            
            // DUAL MODE: Send to XState and legacy deselection
            this.stateMachine.send({ type: 'CLICK_ELSEWHERE' });
            this.deselectDivider();
            return; // Exit after deselection
        }
        
        // SIMPLE LOGIC: If hovering a divider, select it
        if (this.interactionState === 'HOVERING' && this.hoveredDivider) {
            console.log('Selecting hovered divider');
            
            // DUAL MODE: Send to XState and legacy selection
            this.stateMachine.send({ 
                type: 'CLICK_DIVIDER', 
                divider: this.hoveredDivider 
            });
            this.selectDivider(this.hoveredDivider);
            return;
        }
        
        // SIMPLE LOGIC: Only add dividers in NORMAL state
        if (this.interactionState === 'NORMAL') {
            console.log('In NORMAL state - checking for ghost divider');
            const result = this.getShelfInteriorIntersection();
            if (result !== null) {
                const sectionInfo = this.detectHoveredSection(result.position);
                if (sectionInfo && sectionInfo.canAdd) {
                    console.log(`Adding divider at position: ${sectionInfo.centerPosition.toFixed(2)}`);
                    
                    // XState handles the addition now
                    this.stateMachine.send({ 
                        type: 'CLICK_EMPTY_SPACE', 
                        position: sectionInfo.centerPosition 
                    });
                }
            }
        }
    }
    
    onMouseDown(event) {
        console.log('onMouseDown - state:', this.interactionState, 'selectedDivider:', !!this.selectedDivider);
        if (this.interactionState === 'SELECTED' && this.selectedDivider) {
            console.log('Selected divider mousedown - PREPARING for potential drag (not starting yet)');
            // Don't start drag immediately - wait for mouse movement
            // Just store that we're ready to start dragging if mouse moves
            this.readyToDrag = true;
            
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.dragStartPosition = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
            
            // DUAL MODE: Send to XState
            this.stateMachine.send({ 
                type: 'MOUSE_DOWN', 
                position: this.dragStartPosition 
            });
        } else {
            console.log('NOT preparing drag - conditions not met');
            this.readyToDrag = false;
        }
    }
    
    onMouseUp(event) {
        console.log('onMouseUp - state:', this.interactionState, 'isDragging:', this.isDragging, 'readyToDrag:', this.readyToDrag);
        
        if (this.interactionState === 'DRAGGING') {
            console.log('XState will handle drag end');
        } else {
            console.log('NOT dragging - just sending MOUSE_UP to XState');
        }
        
        // XState handles drag ending now
        this.stateMachine.send({ type: 'MOUSE_UP' });
        
        // Reset the ready to drag flag
        this.readyToDrag = false;
    }
    
    getShelfInteriorIntersection() {
        if (!this.currentConfig) return null;
        
        const app = window.app;
        if (!app) return null;
        
        // Create a virtual plane at the front face of the shelf interior for raycasting
        const thickness = this.currentConfig.materialThickness;
        const interiorHeight = app.getInteriorHeight();
        const interiorWidth = this.currentConfig.width - (2 * thickness);
        
        // Create a plane geometry covering the interior front face
        const planeGeometry = new THREE.PlaneGeometry(interiorWidth, interiorHeight);
        const planeMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        const intersectionPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        
        // Position the plane at the front face of the interior space
        intersectionPlane.position.set(
            0, // centered horizontally
            thickness + (interiorHeight / 2), // centered vertically in interior space
            this.currentConfig.depth / 2 // at the front face
        );
        
        // Raycast against this plane
        const intersects = this.raycaster.intersectObject(intersectionPlane);
        
        // Clean up the temporary plane
        planeGeometry.dispose();
        planeMaterial.dispose();
        
        if (intersects.length === 0) {
            return null;
        }
        
        const hit = intersects[0];
        const worldPoint = hit.point;
        
        // Convert world Y position to shelf interior position (0 to interiorHeight)
        const shelfInteriorY = worldPoint.y - thickness; // Subtract bottom shelf thickness
        
        const originalConfig = app.currentConfig;
        const units = originalConfig.units;
        
        // Convert from inches (Three.js units) to current units
        const position = app.fromInches(shelfInteriorY);
        
        if (this.debugMode) {
            console.log(`Shelf intersection: worldY=${worldPoint.y.toFixed(2)}, interiorY=${shelfInteriorY.toFixed(2)}, position=${position.toFixed(2)}${units}`);
        }
        
        // Only return valid positions within shelf bounds
        if (shelfInteriorY >= 0 && shelfInteriorY <= app.toInches(interiorHeight)) {
            return { position, units, worldPoint };
        }
        
        return null;
    }
    
    updateShelf(config) {
        this.currentConfig = config; // Store for 3D interaction
        
        // Clean up interaction state when shelf is regenerated
        this.cleanupInteractionState();
        
        while(this.shelfGroup.children.length > 0) {
            const child = this.shelfGroup.children[0];
            this.shelfGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
        
        const materials = this.createMaterials(config.materialType, config.woodGrain);
        const shelf = this.createShelfStructure(config, materials);
        
        this.shelfGroup.add(shelf);
        this.centerShelf();
    }
    
    createMaterials(materialType, useWoodGrain = true) {
        const colorMap = {
            plywood: { main: 0xD2B48C, edge: 0x8B7355 },
            mdf: { main: 0xF5DEB3, edge: 0xDEB887 },
            pine: { main: 0xFFF8DC, edge: 0xF0E68C },
            oak: { main: 0xDEB887, edge: 0xCD853F },
            maple: { main: 0xFAF0E6, edge: 0xF5DEB3 }
        };
        
        const colors = colorMap[materialType] || colorMap.plywood;
        
        if (useWoodGrain) {
            const mainTexture = this.createWoodGrainTexture(colors.main, materialType);
            const edgeTexture = this.createWoodGrainTexture(colors.edge, materialType);
            
            return {
                main: new THREE.MeshLambertMaterial({ 
                    map: mainTexture,
                    transparent: false,
                    opacity: 1.0
                }),
                edge: new THREE.MeshLambertMaterial({ 
                    map: edgeTexture,
                    transparent: false,
                    opacity: 1.0
                })
            };
        } else {
            return {
                main: new THREE.MeshLambertMaterial({ 
                    color: colors.main,
                    transparent: true,
                    opacity: 0.9
                }),
                edge: new THREE.MeshLambertMaterial({ 
                    color: colors.edge,
                    transparent: true,
                    opacity: 0.95
                })
            };
        }
    }
    
    createWoodGrainTexture(baseColor, materialType) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        const color = new THREE.Color(baseColor);
        const r = Math.floor(color.r * 255);
        const g = Math.floor(color.g * 255);
        const b = Math.floor(color.b * 255);
        
        context.fillStyle = `rgb(${r}, ${g}, ${b})`;
        context.fillRect(0, 0, 512, 512);
        
        if (materialType !== 'mdf') {
            // Make wood grain much more visible with higher contrast
            context.strokeStyle = `rgba(${Math.max(0, r-60)}, ${Math.max(0, g-60)}, ${Math.max(0, b-60)}, 0.8)`;
            context.lineWidth = 2;
            
            // Add more prominent grain lines
            for (let i = 0; i < 40; i++) {
                context.beginPath();
                const y = (i * 12) + Math.random() * 8;
                context.moveTo(0, y);
                
                for (let x = 0; x < 512; x += 8) {
                    const nextY = y + (Math.sin(x * 0.01) * 4) + (Math.random() - 0.5) * 2;
                    context.lineTo(x, nextY);
                }
                context.stroke();
            }
            
            // Add darker grain variations
            context.strokeStyle = `rgba(${Math.max(0, r-80)}, ${Math.max(0, g-80)}, ${Math.max(0, b-80)}, 0.6)`;
            context.lineWidth = 1;
            
            for (let i = 0; i < 25; i++) {
                context.beginPath();
                const y = Math.random() * 512;
                context.moveTo(0, y);
                
                for (let x = 0; x < 512; x += 6) {
                    const nextY = y + (Math.sin(x * 0.008) * 6) + (Math.random() - 0.5) * 3;
                    context.lineTo(x, nextY);
                }
                context.stroke();
            }
            
            // Add more visible knots
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const size = Math.random() * 8 + 3;
                
                context.fillStyle = `rgba(${Math.max(0, r-40)}, ${Math.max(0, g-40)}, ${Math.max(0, b-40)}, 0.7)`;
                context.beginPath();
                context.ellipse(x, y, size, size * 0.4, Math.random() * Math.PI, 0, Math.PI * 2);
                context.fill();
                
                // Add dark center to knots
                context.fillStyle = `rgba(${Math.max(0, r-80)}, ${Math.max(0, g-80)}, ${Math.max(0, b-80)}, 0.9)`;
                context.beginPath();
                context.ellipse(x, y, size * 0.3, size * 0.12, Math.random() * Math.PI, 0, Math.PI * 2);
                context.fill();
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        return texture;
    }
    
    createShelfStructure(config, materials) {
        const group = new THREE.Group();
        const thickness = config.materialThickness;
        
        const sides = this.createSides(config, materials);
        const shelves = this.createShelves(config, materials);
        const backPanel = config.backPanel ? this.createBackPanel(config, materials) : null;
        const dividers = this.createDividers(config, materials);
        const compartmentColors = this.createCompartmentColors(config, materials);
        
        group.add(sides.left);
        group.add(sides.right);
        
        shelves.forEach(shelf => group.add(shelf));
        
        if (backPanel) {
            group.add(backPanel);
        }
        
        dividers.forEach(divider => group.add(divider));
        compartmentColors.forEach(compartment => group.add(compartment));
        
        return group;
    }
    
    createSides(config, materials) {
        const thickness = config.materialThickness;
        const geometry = new THREE.BoxGeometry(thickness, config.height, config.depth);
        
        const sideMaterial = materials.main.clone();
        if (sideMaterial.map) {
            sideMaterial.map = sideMaterial.map.clone();
            sideMaterial.map.repeat.set(config.depth / 12, config.height / 12);
        }
        
        const leftSide = new THREE.Mesh(geometry, sideMaterial);
        leftSide.position.set(-config.width / 2 + thickness / 2, config.height / 2, 0);
        leftSide.castShadow = true;
        leftSide.receiveShadow = true;
        
        const rightSide = new THREE.Mesh(geometry, sideMaterial.clone());
        rightSide.position.set(config.width / 2 - thickness / 2, config.height / 2, 0);
        rightSide.castShadow = true;
        rightSide.receiveShadow = true;
        
        // Create a group for each side to add joint details
        const leftGroup = new THREE.Group();
        const rightGroup = new THREE.Group();
        leftGroup.add(leftSide);
        rightGroup.add(rightSide);
        
        // Add dado grooves for shelves
        this.addDadoGrooves(leftGroup, rightGroup, config);
        
        return { left: leftGroup, right: rightGroup };
    }
    
    createShelves(config, materials) {
        const shelves = [];
        const thickness = config.materialThickness;
        
        // Dado joints: shelves extend into grooves in the side panels
        const shelfWidth = config.width - thickness;
        
        const shelfGeometry = new THREE.BoxGeometry(shelfWidth, thickness, config.depth);
        
        const shelfMaterial = materials.main.clone();
        if (shelfMaterial.map) {
            shelfMaterial.map = shelfMaterial.map.clone();
            shelfMaterial.map.repeat.set(shelfWidth / 12, config.depth / 12);
            shelfMaterial.map.rotation = Math.PI / 2;
        }
        
        // Create top and bottom shelves only
        const topShelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        topShelf.position.set(0, config.height - thickness / 2, 0);
        topShelf.castShadow = true;
        topShelf.receiveShadow = true;
        shelves.push(topShelf);
        
        const bottomShelf = new THREE.Mesh(shelfGeometry, shelfMaterial.clone());
        bottomShelf.position.set(0, thickness / 2, 0);
        bottomShelf.castShadow = true;
        bottomShelf.receiveShadow = true;
        shelves.push(bottomShelf);
        
        return shelves;
    }
    
    createBackPanel(config, materials) {
        const thickness = config.materialThickness / 4;
        const geometry = new THREE.BoxGeometry(
            config.width - (2 * config.materialThickness), 
            config.height, 
            thickness
        );
        
        const backPanel = new THREE.Mesh(geometry, materials.edge);
        backPanel.position.set(0, config.height / 2, -config.depth / 2 + thickness / 2);
        backPanel.castShadow = true;
        backPanel.receiveShadow = true;
        
        return backPanel;
    }
    
    createDividers(config, materials) {
        const dividers = [];
        const thickness = config.materialThickness;
        
        if (!config.shelfLayout || config.shelfLayout.length === 0) {
            return dividers;
        }
        
        // Dado joints: dividers extend into grooves in the side panels
        const shelfWidth = config.width - thickness;
        const shelfDepth = config.depth;
        const interiorHeight = config.height - (2 * thickness); // Space between top and bottom shelves
        const baseY = thickness; // Bottom of interior space
        
        // Sort dividers by position
        const sortedDividers = [...config.shelfLayout].sort((a, b) => a.position - b.position);
        
        // Create horizontal dividers and their associated vertical dividers
        sortedDividers.forEach((dividerConfig, index) => {
            const dividerY = baseY + dividerConfig.position;
            
            // Create the main horizontal divider
            const horizontalDividerGeometry = new THREE.BoxGeometry(
                shelfWidth,
                thickness,
                shelfDepth
            );
            
            const horizontalDivider = new THREE.Mesh(horizontalDividerGeometry, materials.edge.clone());
            horizontalDivider.position.set(0, dividerY, 0);
            horizontalDivider.castShadow = true;
            horizontalDivider.receiveShadow = true;
            
            // Add metadata for hover detection
            horizontalDivider.userData = {
                type: 'horizontal-divider',
                dividerId: dividerConfig.id,
                position: dividerConfig.position
            };
            
            dividers.push(horizontalDivider);
            
            // Create vertical dividers based on new control scheme:
            // First divider controls both above and below spaces
            // Other dividers only control above space
            const spacesToProcess = [];
            
            if (index === 0) {
                // First divider: handle both spaces
                spacesToProcess.push('above', 'below');
            } else {
                // Other dividers: only handle above space
                spacesToProcess.push('above');
            }
            
            spacesToProcess.forEach(spaceType => {
                const spaceConfig = dividerConfig.spaces[spaceType];
                if (spaceConfig && spaceConfig.verticalDividers > 0) {
                    const sectionWidth = shelfWidth / (spaceConfig.verticalDividers + 1);
                    
                    // Calculate the bounds of this space
                    let sectionBottom, sectionTop;
                    
                    if (spaceType === 'above') {
                        sectionBottom = dividerY;
                        // Find the next divider above or use the top shelf
                        if (index === sortedDividers.length - 1) {
                            sectionTop = baseY + interiorHeight;
                        } else {
                            const nextDivider = sortedDividers[index + 1];
                            sectionTop = baseY + nextDivider.position;
                        }
                    } else { // below
                        sectionTop = dividerY;
                        sectionBottom = baseY; // Always goes to bottom for first divider
                    }
                    
                    const sectionHeight = sectionTop - sectionBottom;
                    
                    if (sectionHeight > thickness) {
                        for (let vIndex = 1; vIndex <= spaceConfig.verticalDividers; vIndex++) {
                            const dividerX = -shelfWidth / 2 + (vIndex * sectionWidth);
                            
                            const verticalDividerGeometry = new THREE.BoxGeometry(
                                thickness,
                                sectionHeight,
                                shelfDepth
                            );
                            
                            const verticalDivider = new THREE.Mesh(verticalDividerGeometry, materials.edge.clone());
                            verticalDivider.position.set(
                                dividerX, 
                                sectionBottom + (sectionHeight / 2), 
                                0
                            );
                            verticalDivider.castShadow = true;
                            verticalDivider.receiveShadow = true;
                            dividers.push(verticalDivider);
                        }
                    }
                }
            });
        });
        
        return dividers;
    }
    
    
    addDadoGrooves(leftGroup, rightGroup, config) {
        const thickness = config.materialThickness;
        const grooveDepth = thickness / 3;
        const grooveHeight = thickness;
        const zOffset = 0.01; // Small offset to prevent z-fighting
        
        // Dark material for grooves
        const grooveMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a2a2a
        });
        
        // Calculate all shelf positions (including dividers)
        const shelfPositions = [thickness / 2, config.height - thickness / 2]; // Top and bottom
        
        // Add positions for horizontal dividers
        if (config.shelfLayout && config.shelfLayout.length > 0) {
            config.shelfLayout.forEach(divider => {
                shelfPositions.push(thickness + divider.position);
            });
        }
        
        // Create grooves at each shelf position
        shelfPositions.forEach(yPos => {
            // Left side grooves - positioned slightly inside the side panel
            const leftGroove = new THREE.BoxGeometry(grooveDepth, grooveHeight, config.depth - zOffset * 2);
            const leftGrooveMesh = new THREE.Mesh(leftGroove, grooveMaterial);
            leftGrooveMesh.position.set(
                -config.width / 2 + thickness - grooveDepth / 2 - zOffset,
                yPos,
                0
            );
            leftGroup.add(leftGrooveMesh);
            
            // Right side grooves - positioned slightly inside the side panel
            const rightGroove = new THREE.BoxGeometry(grooveDepth, grooveHeight, config.depth - zOffset * 2);
            const rightGrooveMesh = new THREE.Mesh(rightGroove, grooveMaterial);
            rightGrooveMesh.position.set(
                config.width / 2 - thickness + grooveDepth / 2 + zOffset,
                yPos,
                0
            );
            rightGroup.add(rightGrooveMesh);
        });
    }
    
    createCompartmentColors(config) {
        const compartments = [];
        const thickness = config.materialThickness;
        
        if (!config.shelfLayout || config.shelfLayout.length === 0) {
            return compartments;
        }
        
        // Calculate interior dimensions
        const interiorWidth = config.width - (2 * thickness);
        const interiorDepth = config.depth;
        const interiorHeight = config.height - (2 * thickness);
        const baseY = thickness;
        
        // Sort dividers by position
        const sortedDividers = [...config.shelfLayout].sort((a, b) => a.position - b.position);
        
        // Create colored compartments for each space
        sortedDividers.forEach((divider, index) => {
            const dividerY = baseY + divider.position;
            
            // Create compartments based on new control scheme:
            // First divider creates both above and below compartments
            // Other dividers only create above compartments
            const spacesToProcess = [];
            
            if (index === 0) {
                // First divider: handle both spaces
                spacesToProcess.push('above', 'below');
            } else {
                // Other dividers: only handle above space
                spacesToProcess.push('above');
            }
            
            spacesToProcess.forEach(spaceType => {
                // Calculate space bounds
                let sectionBottom, sectionTop;
                
                if (spaceType === 'above') {
                    sectionBottom = dividerY;
                    if (index === sortedDividers.length - 1) {
                        sectionTop = baseY + interiorHeight;
                    } else {
                        const nextDivider = sortedDividers[index + 1];
                        sectionTop = baseY + nextDivider.position;
                    }
                } else { // below
                    sectionTop = dividerY;
                    sectionBottom = baseY; // Always goes to bottom for first divider
                }
                
                const sectionHeight = sectionTop - sectionBottom;
                
                if (sectionHeight > thickness) {
                    // Create transparent colored plane for this space
                    const compartmentGeometry = new THREE.BoxGeometry(
                        interiorWidth - 0.02, // Slightly smaller to avoid z-fighting
                        sectionHeight - 0.02,
                        interiorDepth - 0.02
                    );
                    
                    const compartmentMaterial = new THREE.MeshBasicMaterial({
                        color: this.generateCompartmentColor(`${divider.id}-${spaceType}`),
                        transparent: true,
                        opacity: 0.15,
                        side: THREE.DoubleSide
                    });
                    
                    const compartmentMesh = new THREE.Mesh(compartmentGeometry, compartmentMaterial);
                    compartmentMesh.position.set(
                        0,
                        sectionBottom + sectionHeight / 2,
                        0
                    );
                    
                    // Store the space ID for reference
                    compartmentMesh.userData = { spaceId: `${divider.id}-${spaceType}` };
                    
                    compartments.push(compartmentMesh);
                }
            });
        });
        
        return compartments;
    }
    
    generateCompartmentColor(dividerId) {
        // High-contrast color palette that's easily distinguishable
        const colors = [
            0xff4757, // Bright Red
            0x3742fa, // Royal Blue  
            0x2ed573, // Bright Green
            0xffa502, // Orange
            0xa4b0be, // Light Gray
            0x8e44ad, // Purple
            0xf39c12, // Golden Yellow
            0xe74c3c, // Crimson
            0x1e90ff, // Dodger Blue
            0x27ae60  // Forest Green
        ];
        
        // Use divider ID to consistently pick a color
        const hash = dividerId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    
    centerShelf() {
        const box = new THREE.Box3().setFromObject(this.shelfGroup);
        const center = box.getCenter(new THREE.Vector3());
        this.shelfGroup.position.sub(center);
        this.shelfGroup.position.y += (box.max.y - box.min.y) / 2;
    }
    
    setView(viewType) {
        const config = this.getCurrentConfig();
        const maxDim = Math.max(config.width, config.height, config.depth);
        const distance = maxDim * 1.5;
        
        switch (viewType) {
            case 'front':
                this.camera.position.set(0, config.height / 2, distance);
                this.camera.lookAt(0, config.height / 2, 0);
                break;
            case 'side':
                this.camera.position.set(distance, config.height / 2, 0);
                this.camera.lookAt(0, config.height / 2, 0);
                break;
            case 'top':
                this.camera.position.set(0, distance, 0);
                this.camera.lookAt(0, 0, 0);
                break;
            case 'iso':
                this.camera.position.set(distance * 0.7, distance * 0.7, distance * 0.7);
                this.camera.lookAt(0, config.height / 2, 0);
                break;
        }
        
        this.controls.update();
    }
    
    getCurrentConfig() {
        return {
            width: parseFloat(document.getElementById('width').value) || 36,
            height: parseFloat(document.getElementById('height').value) || 72,
            depth: parseFloat(document.getElementById('depth').value) || 12
        };
    }
    
    // For future 3D interaction - convert 3D world position to shelf interior position
    worldToShelfPosition(worldY, config) {
        // Simple approach: just return the world Y position directly
        // We'll handle the coordinate conversion in the section detection
        return worldY;
    }
    
    // For future 3D interaction - convert shelf position to 3D world position  
    shelfToWorldPosition(shelfY, config) {
        const thickness = config.materialThickness;
        const baseY = thickness;
        return shelfY + baseY;
    }
    
    // Debug mode methods
    enableDebugMode() {
        this.debugMode = true;
        console.log('3D Debug mode enabled - hover shelf interior to see coordinates');
    }
    
    disableDebugMode() {
        this.debugMode = false;
        this.hideDebugVisualization();
        console.log('3D Debug mode disabled');
    }
    
    updateDebugVisualization(worldPoint) {
        if (!this.debugSphere) {
            const geometry = new THREE.SphereGeometry(0.5, 8, 6);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            this.debugSphere = new THREE.Mesh(geometry, material);
            this.scene.add(this.debugSphere);
        }
        
        this.debugSphere.position.copy(worldPoint);
        this.debugSphere.visible = true;
    }
    
    hideDebugVisualization() {
        if (this.debugSphere) {
            this.debugSphere.visible = false;
        }
    }
    
    // Smart Section Detection
    detectHoveredSection(mouseYPosition) {
        if (!this.currentConfig) return null;
        
        const app = window.app;
        if (!app) return null;
        
        const interiorHeight = app.getInteriorHeight();
        const dividers = [...app.currentConfig.shelfLayout].sort((a, b) => a.position - b.position);
        const minSectionHeight = app.currentConfig.units === 'metric' ? 10 : 4; // 10cm or 4"
        
        // Empty shelf case
        if (dividers.length === 0) {
            // Check if mouse is within the shelf interior bounds
            if (mouseYPosition >= 0 && mouseYPosition <= interiorHeight) {
                // For empty shelf, the center position should be based on WHERE the mouse is
                // The ghost should appear at the center of the entire shelf
                const centerPosition = interiorHeight / 2;
                
                if (this.debugMode) {
                    console.log(`Empty shelf: mouse at ${mouseYPosition.toFixed(2)}, ghost at center ${centerPosition.toFixed(2)}`);
                }
                
                return {
                    centerPosition: centerPosition,
                    canAdd: interiorHeight >= minSectionHeight * 2,
                    sectionIndex: 0,
                    sectionBounds: { bottom: 0, top: interiorHeight }
                };
            } else {
                if (this.debugMode) {
                    console.log(`Mouse outside empty shelf bounds: ${mouseYPosition} not in 0 to ${interiorHeight}`);
                }
                return null; // Mouse is outside shelf bounds
            }
        }
        
        // Find which section the mouse is in
        for (let i = 0; i <= dividers.length; i++) {
            const bottomBound = i === 0 ? 0 : dividers[i - 1].position;
            const topBound = i === dividers.length ? interiorHeight : dividers[i].position;
            
            if (mouseYPosition >= bottomBound && mouseYPosition <= topBound) {
                const sectionHeight = topBound - bottomBound;
                const centerPosition = bottomBound + (sectionHeight / 2);
                
                // Check if section is big enough to split
                const canAdd = sectionHeight >= minSectionHeight * 2;
                
                return {
                    centerPosition,
                    canAdd,
                    sectionIndex: i,
                    sectionBounds: { bottom: bottomBound, top: topBound },
                    sectionHeight
                };
            }
        }
        
        return null;
    }
    
    updateGhostDivider(sectionInfo) {
        if (!sectionInfo || !sectionInfo.canAdd) {
            this.hideGhostDivider();
            return;
        }
        
        if (!this.ghostDivider) {
            this.createGhostDivider();
        }
        
        // Convert section center to world position for 3D display
        // sectionInfo.centerPosition is in current units, need to convert to inches first
        const app = window.app;
        const centerInInches = app ? app.toInches(sectionInfo.centerPosition) : sectionInfo.centerPosition;
        const worldY = this.shelfToWorldPosition(centerInInches, this.currentConfig);
        
        if (this.debugMode) {
            console.log(`Ghost divider: center=${sectionInfo.centerPosition.toFixed(2)}, centerInches=${centerInInches.toFixed(2)}, worldY=${worldY.toFixed(2)}`);
        }
        
        this.ghostDivider.position.y = worldY;
        this.ghostDivider.visible = true;
    }
    
    createGhostDivider() {
        if (!this.currentConfig) return;
        
        const thickness = this.currentConfig.materialThickness;
        const shelfWidth = this.currentConfig.width - thickness;
        const shelfDepth = this.currentConfig.depth;
        
        const geometry = new THREE.BoxGeometry(shelfWidth, thickness, shelfDepth);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthTest: false // Render on top of other transparent objects
        });
        
        this.ghostDivider = new THREE.Mesh(geometry, material);
        this.ghostDivider.position.set(0, 0, 0.1); // Slightly forward to avoid z-fighting
        this.ghostDivider.visible = false;
        this.ghostDivider.renderOrder = 999; // Render after other objects
        this.scene.add(this.ghostDivider);
    }
    
    hideGhostDivider() {
        if (this.ghostDivider) {
            this.ghostDivider.visible = false;
        }
    }
    
    // Existing Divider Hover Detection
    detectHoveredExistingDivider() {
        // Raycast against all shelf objects to find horizontal dividers
        const intersects = this.raycaster.intersectObjects(this.shelfGroup.children, true);
        
        for (const intersect of intersects) {
            const object = intersect.object;
            if (object.userData && object.userData.type === 'horizontal-divider') {
                return {
                    mesh: object,
                    dividerId: object.userData.dividerId,
                    position: object.userData.position,
                    intersection: intersect
                };
            }
        }
        
        return null;
    }
    
    updateExistingDividerHighlight(dividerInfo) {
        // Clear any previous highlight
        this.clearExistingDividerHighlight();
        
        // Store reference to highlighted divider
        this.hoveredDivider = dividerInfo;
        
        // Create highlight effect by modifying material
        const mesh = dividerInfo.mesh;
        if (mesh.material) {
            // Store original material if not already stored
            if (!mesh.userData.originalMaterial) {
                mesh.userData.originalMaterial = mesh.material.clone();
            }
            
            // Apply highlight material
            mesh.material = new THREE.MeshBasicMaterial({
                color: 0xff4444, // Red highlight for removal indication
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
        }
    }
    
    clearExistingDividerHighlight() {
        if (this.hoveredDivider && this.hoveredDivider.mesh) {
            const mesh = this.hoveredDivider.mesh;
            
            // Restore original material
            if (mesh.userData.originalMaterial) {
                mesh.material = mesh.userData.originalMaterial.clone();
            }
        }
        
        this.hoveredDivider = null;
    }
    
    // New Multi-State Interaction Methods
    updateHoverState(dividerInfo) {
        // Clear any previous state
        this.clearHoverState();
        
        // Store hovered divider
        this.hoveredDivider = dividerInfo;
        
        // Apply subtle hover highlight
        const mesh = dividerInfo.mesh;
        if (mesh.material) {
            if (!mesh.userData.originalMaterial) {
                mesh.userData.originalMaterial = mesh.material.clone();
            }
            
            // Subtle blue highlight for hover state
            mesh.material = new THREE.MeshBasicMaterial({
                color: 0x4444ff,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
        }
        
        // Show measurements
        this.showMeasurements(dividerInfo);
    }
    
    clearHoverState() {
        this.clearExistingDividerHighlight();
        this.hideMeasurements();
    }
    
    selectDivider(dividerInfo) {
        // NOTE: State management is now handled by XState
        // This method only handles visual effects
        
        // Apply strong selection highlight
        const mesh = dividerInfo.mesh;
        if (mesh.material) {
            if (!mesh.userData.originalMaterial) {
                mesh.userData.originalMaterial = mesh.material.clone();
            }
            
            // Strong yellow highlight for selected state
            mesh.material = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
        }
        
        // Show measurements and delete button
        this.showMeasurements(dividerInfo);
        this.showDeleteButton(dividerInfo);
        
        if (this.debugMode) {
            console.log('Selected divider:', dividerInfo.dividerId);
        }
    }
    
    deselectDivider() {
        // Get current selected divider from XState
        const selectedDivider = this.getSelectedDivider();
        if (selectedDivider) {
            // Restore original material
            const mesh = selectedDivider.mesh;
            if (mesh.userData.originalMaterial) {
                mesh.material = mesh.userData.originalMaterial.clone();
            }
            
            this.hideMeasurements();
            this.hideDeleteButton();
            
            console.log('Deselected divider:', selectedDivider.dividerId);
        }
        
        // NOTE: State management is now handled by XState
        // This method only handles visual cleanup
    }
    
    startDrag(event) {
        // NOTE: State management is now handled by XState
        // This method only handles camera controls and visual effects
        
        // Disable camera controls during drag
        this.controls.enabled = false;
        
        // IMPORTANT: Always update dragStartPosition to current mouse position
        // This prevents jumps when starting a new drag from a different position
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.dragStartPosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        if (this.debugMode) {
            console.log('Started dragging divider:', this.selectedDivider.dividerId);
            console.log('Drag start position:', this.dragStartPosition);
        }
    }
    
    handleDragMove(event) {
        if (!this.selectedDivider || !this.isDragging) return;
        
        const app = window.app;
        if (!app) return;
        
        // Update mouse position and raycaster
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Use the same raycasting approach as ghost divider positioning
        const result = this.getShelfInteriorIntersection();
        if (result !== null) {
            // Apply constraints to the new position
            const constrainedPosition = this.calculateConstrainedPositionAbsolute(result.position);
            
            if (constrainedPosition !== null) {
                // Update divider position in real-time
                this.updateDividerPosition(constrainedPosition);
                
                // Update measurements
                if (this.measurementOverlays.length > 0) {
                    this.showMeasurements(this.selectedDivider);
                }
                
                if (this.debugMode) {
                    console.log(`Dragging to position: ${constrainedPosition.toFixed(2)} (cursor at: ${result.position.toFixed(2)})`);
                }
            }
        }
    }
    
    calculateConstrainedPositionAbsolute(absolutePosition) {
        const app = window.app;
        if (!app || !this.selectedDivider) return null;
        
        const interiorHeight = app.getInteriorHeight();
        const dividers = [...app.currentConfig.shelfLayout].sort((a, b) => a.position - b.position);
        const currentIndex = dividers.findIndex(d => d.id === this.selectedDivider.dividerId);
        
        // Define minimum spacing
        const minSpacing = app.currentConfig.units === 'metric' ? 5 : 2; // 5cm or 2"
        
        // Calculate constraints
        let minPosition = minSpacing; // Bottom constraint
        let maxPosition = interiorHeight - minSpacing; // Top constraint
        
        // Constraint from divider below
        if (currentIndex > 0) {
            minPosition = dividers[currentIndex - 1].position + minSpacing;
        }
        
        // Constraint from divider above
        if (currentIndex < dividers.length - 1) {
            maxPosition = dividers[currentIndex + 1].position - minSpacing;
        }
        
        // Apply constraints
        let newPosition = Math.max(minPosition, Math.min(maxPosition, absolutePosition));
        
        // Optional: Snap to reasonable increments
        const snapIncrement = app.currentConfig.units === 'metric' ? 0.5 : 0.25; // 0.5cm or 0.25"
        newPosition = Math.round(newPosition / snapIncrement) * snapIncrement;
        
        return newPosition;
    }

    // Keep the old method for backwards compatibility (though it's no longer used)
    calculateConstrainedPosition(worldDelta) {
        const app = window.app;
        if (!app || !this.selectedDivider) return null;
        
        const interiorHeight = app.getInteriorHeight();
        const dividers = [...app.currentConfig.shelfLayout].sort((a, b) => a.position - b.position);
        const currentIndex = dividers.findIndex(d => d.id === this.selectedDivider.dividerId);
        const currentPosition = this.selectedDivider.position;
        
        // Convert world delta to shelf units
        const deltaInShelfUnits = app.fromInches(worldDelta);
        let newPosition = currentPosition + deltaInShelfUnits;
        
        // Define minimum spacing
        const minSpacing = app.currentConfig.units === 'metric' ? 5 : 2; // 5cm or 2"
        
        // Calculate constraints
        let minPosition = minSpacing; // Bottom constraint
        let maxPosition = interiorHeight - minSpacing; // Top constraint
        
        // Constraint from divider below
        if (currentIndex > 0) {
            minPosition = dividers[currentIndex - 1].position + minSpacing;
        }
        
        // Constraint from divider above
        if (currentIndex < dividers.length - 1) {
            maxPosition = dividers[currentIndex + 1].position - minSpacing;
        }
        
        // Apply constraints
        newPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
        
        // Optional: Snap to reasonable increments
        const snapIncrement = app.currentConfig.units === 'metric' ? 0.5 : 0.25; // 0.5cm or 0.25"
        newPosition = Math.round(newPosition / snapIncrement) * snapIncrement;
        
        return newPosition;
    }
    
    updateDividerPosition(newPosition) {
        if (!this.selectedDivider) return;
        
        const app = window.app;
        if (!app) return;
        
        // Update the 3D mesh position
        const thickness = this.currentConfig.materialThickness;
        const baseY = thickness;
        const worldY = baseY + app.toInches(newPosition);
        
        this.selectedDivider.mesh.position.y = worldY;
        
        // Update the divider data
        this.selectedDivider.position = newPosition;
        
        // Update the delete button position if visible
        if (this.deleteButton) {
            this.deleteButton.position.y = worldY;
        }
    }
    
    // endDrag method removed - XState now handles drag end via commitDragPosition action
    
    // Measurement Overlay System
    showMeasurements(dividerInfo) {
        // Clear any existing measurements
        this.hideMeasurements();
        
        const app = window.app;
        if (!app) return;
        
        const interiorHeight = app.getInteriorHeight();
        const dividers = [...app.currentConfig.shelfLayout].sort((a, b) => a.position - b.position);
        const currentPosition = dividerInfo.position;
        const units = app.currentConfig.units === 'metric' ? 'cm' : '"';
        
        // Calculate distances above and below
        let distanceBelow = currentPosition; // Distance to bottom
        let distanceAbove = interiorHeight - currentPosition; // Distance to top
        
        // Find adjacent dividers
        const currentIndex = dividers.findIndex(d => d.id === dividerInfo.dividerId);
        if (currentIndex > 0) {
            distanceBelow = currentPosition - dividers[currentIndex - 1].position;
        }
        if (currentIndex < dividers.length - 1) {
            distanceAbove = dividers[currentIndex + 1].position - currentPosition;
        }
        
        if (this.debugMode) {
            console.log(`Measurement debug:
                Interior height: ${interiorHeight.toFixed(2)}${units}
                Current position: ${currentPosition.toFixed(2)}${units}
                Current index: ${currentIndex}
                Distance below: ${distanceBelow.toFixed(2)}${units}
                Distance above: ${distanceAbove.toFixed(2)}${units}
                Total dividers: ${dividers.length}`);
        }
        
        // Create measurement text objects
        const worldY = dividerInfo.mesh.position.y;
        const worldX = dividerInfo.mesh.position.x;
        const worldZ = dividerInfo.mesh.position.z + this.currentConfig.depth / 2 + 2; // In front of shelf
        
        // Create text sprites for measurements
        this.createMeasurementText(
            `${distanceBelow.toFixed(1)}${units}`,
            worldX, 
            worldY - (app.toInches(distanceBelow) / 2), 
            worldZ,
            'below'
        );
        
        this.createMeasurementText(
            `${distanceAbove.toFixed(1)}${units}`,
            worldX,
            worldY + (app.toInches(distanceAbove) / 2),
            worldZ,
            'above'
        );
        
        if (this.debugMode) {
            console.log(`Measurements: ${distanceBelow.toFixed(1)}${units} below, ${distanceAbove.toFixed(1)}${units} above`);
        }
    }
    
    createMeasurementText(text, x, y, z, type) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 80;
        
        // Draw background with border
        context.fillStyle = 'rgba(255, 255, 255, 0.95)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border
        context.strokeStyle = type === 'below' ? '#2196F3' : '#4CAF50';
        context.lineWidth = 3;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // Draw text - black and larger
        context.fillStyle = '#000000';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Position and scale the sprite - larger
        sprite.position.set(x, y, z);
        sprite.scale.set(6, 3, 1); // Bigger labels
        
        // Store for cleanup
        sprite.userData = { type: 'measurement', measurementType: type };
        this.measurementOverlays.push(sprite);
        this.scene.add(sprite);
    }
    
    hideMeasurements() {
        // Remove all measurement overlays
        this.measurementOverlays.forEach(sprite => {
            this.scene.remove(sprite);
            if (sprite.material.map) {
                sprite.material.map.dispose();
            }
            sprite.material.dispose();
        });
        this.measurementOverlays = [];
    }
    
    showDeleteButton(dividerInfo) {
        // Clear any existing delete button
        this.hideDeleteButton();
        
        const worldY = dividerInfo.mesh.position.y;
        const worldX = dividerInfo.mesh.position.x + this.currentConfig.width / 2 - 2; // Right side of shelf
        const worldZ = dividerInfo.mesh.position.z + this.currentConfig.depth / 2 + 5; // Further in front of shelf
        
        // Create delete button
        this.createDeleteButton(worldX, worldY, worldZ, dividerInfo.dividerId);
        
        console.log(`Delete button positioned at: x=${worldX.toFixed(2)}, y=${worldY.toFixed(2)}, z=${worldZ.toFixed(2)}`);
        
        if (this.debugMode) {
            console.log('Showing delete button for divider:', dividerInfo.dividerId);
        }
    }
    
    createDeleteButton(x, y, z, dividerId) {
        // Create larger canvas for bigger button
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        
        this.redrawDeleteButton(context, false); // Start in normal state
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Position and scale the sprite - much bigger
        sprite.position.set(x, y, z);
        sprite.scale.set(4, 4, 1); // Much larger button
        
        // Ensure it renders on top
        sprite.renderOrder = 1000; // Higher than ghost divider
        sprite.material.depthTest = false; // Always render on top
        
        // Store metadata for click detection
        sprite.userData = { 
            type: 'delete-button', 
            dividerId: dividerId,
            isInteractable: true,
            canvas: canvas,
            context: context
        };
        
        this.deleteButton = sprite;
        this.scene.add(sprite);
        
        console.log('Delete button created and added to scene');
    }
    
    redrawDeleteButton(context, isHovered) {
        const centerX = 50;
        const centerY = 50;
        const radius = 40;
        
        // Clear canvas
        context.clearRect(0, 0, 100, 100);
        
        // Draw drop shadow for 3D effect
        if (isHovered) {
            context.shadowColor = 'rgba(0, 0, 0, 0.4)';
            context.shadowBlur = 8;
            context.shadowOffsetX = 2;
            context.shadowOffsetY = 2;
        }
        
        // Draw circular background
        context.fillStyle = isHovered ? '#d32f2f' : '#f44336'; // Darker when hovered
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Draw white border - thicker when hovered
        context.strokeStyle = '#ffffff';
        context.lineWidth = isHovered ? 5 : 3;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
        
        // Draw X symbol - thicker when hovered
        context.strokeStyle = '#ffffff';
        context.lineWidth = isHovered ? 7 : 5;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(centerX - 18, centerY - 18);
        context.lineTo(centerX + 18, centerY + 18);
        context.moveTo(centerX + 18, centerY - 18);
        context.lineTo(centerX - 18, centerY + 18);
        context.stroke();
        
        // Add subtle inner highlight when hovered
        if (isHovered) {
            context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(centerX, centerY, radius - 8, 0, Math.PI * 2);
            context.stroke();
        }
    }
    
    hideDeleteButton() {
        if (this.deleteButton) {
            this.scene.remove(this.deleteButton);
            if (this.deleteButton.material.map) {
                this.deleteButton.material.map.dispose();
            }
            this.deleteButton.material.dispose();
            this.deleteButton = null;
        }
    }
    
    updateDeleteButtonHover() {
        if (!this.deleteButton) {
            this.deleteButtonHovered = false;
            return;
        }
        
        // Raycast against the delete button
        const intersects = this.raycaster.intersectObject(this.deleteButton);
        const isHovered = intersects.length > 0;
        
        // Update hover state if changed
        if (isHovered !== this.deleteButtonHovered) {
            this.deleteButtonHovered = isHovered;
            
            // Redraw button with new state
            const context = this.deleteButton.userData.context;
            this.redrawDeleteButton(context, isHovered);
            
            // Update texture
            this.deleteButton.material.map.needsUpdate = true;
            
            if (this.debugMode) {
                console.log('Delete button hover:', isHovered);
            }
        }
    }
    
    checkDeleteButtonClick() {
        if (!this.deleteButton) {
            return false;
        }
        
        // Raycast against the delete button
        const intersects = this.raycaster.intersectObject(this.deleteButton);
        
        if (this.debugMode) {
            console.log(`Delete button raycast: ${intersects.length} intersections`);
        }
        
        return intersects.length > 0;
    }
    
    cleanupInteractionState() {
        // Clear all interactive elements when shelf is regenerated
        this.hideMeasurements();
        this.hideDeleteButton();
        this.hideGhostDivider();
        
        // Reset state
        this.interactionState = 'NORMAL';
        this.selectedDivider = null;
        this.hoveredDivider = null;
        this.isDragging = false;
        this.dragStartPosition = null;
        this.deleteButtonHovered = false;
        this.justDeleted = false; // Reset delete flag
        this.justDeselected = false; // Reset deselect flag
        this.readyToDrag = false; // Reset drag flag
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}