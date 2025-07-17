import * as THREE from 'three';

interface DistanceLabel {
    id: string;
    distance: number;
    position: THREE.Vector3;
    element: HTMLElement;
    line?: THREE.Line;
}

interface DividerData {
    id: string;
    position: number;
    type: 'horizontal' | 'vertical';
}

interface ShelfConfig {
    width: number;
    height: number;
    depth: number;
    materialThickness: number;
}

export class DistanceLabelManager {
    private labels: Map<string, DistanceLabel> = new Map();
    private container: HTMLElement;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;

    constructor(container: HTMLElement, camera: THREE.Camera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this.container = container;
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        this.setupLabelContainer();
    }

    private setupLabelContainer() {
        // Create overlay container for labels if it doesn't exist
        let labelContainer = document.getElementById('distance-labels');
        if (!labelContainer) {
            labelContainer = document.createElement('div');
            labelContainer.id = 'distance-labels';
            labelContainer.style.position = 'absolute';
            labelContainer.style.top = '0';
            labelContainer.style.left = '0';
            labelContainer.style.pointerEvents = 'none';
            labelContainer.style.zIndex = '1000';
            labelContainer.style.width = '100%';
            labelContainer.style.height = '100%';
            this.container.appendChild(labelContainer);
        }
    }

    // Calculate distances for a horizontal divider
    calculateHorizontalDividerDistances(
        hoveredDivider: DividerData,
        allHorizontalDividers: DividerData[],
        config: ShelfConfig
    ): Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass', toName: string}> {
        const distances: Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass', toName: string}> = [];
        const thickness = config.materialThickness;
        const interiorHeight = config.height - (2 * thickness);
        
        // Sort dividers by position
        const sortedDividers = [...allHorizontalDividers]
            .filter(d => d.id !== hoveredDivider.id)
            .sort((a, b) => a.position - b.position);
        
        const hoveredPosition = hoveredDivider.position;
        
        // Distance to divider above (or top carcass)
        const dividersAbove = sortedDividers.filter(d => d.position > hoveredPosition);
        let distanceAbove: number;
        let aboveName: string;
        let aboveType: 'divider' | 'carcass';
        
        if (dividersAbove.length > 0) {
            const nextDivider = dividersAbove[0];
            distanceAbove = nextDivider.position - hoveredPosition;
            aboveName = `Divider ${sortedDividers.indexOf(nextDivider) + 1}`;
            aboveType = 'divider';
        } else {
            distanceAbove = interiorHeight - hoveredPosition;
            aboveName = 'Top';
            aboveType = 'carcass';
        }
        
        // Distance to divider below (or bottom carcass)
        const dividersBelow = sortedDividers.filter(d => d.position < hoveredPosition);
        let distanceBelow: number;
        let belowName: string;
        let belowType: 'divider' | 'carcass';
        
        if (dividersBelow.length > 0) {
            const prevDivider = dividersBelow[dividersBelow.length - 1];
            distanceBelow = hoveredPosition - prevDivider.position;
            belowName = `Divider ${sortedDividers.indexOf(prevDivider) + 1}`;
            belowType = 'divider';
        } else {
            distanceBelow = hoveredPosition;
            belowName = 'Bottom';
            belowType = 'carcass';
        }
        
        // Calculate 3D positions for labels
        const worldY = thickness + hoveredPosition;
        const midpointAbove = worldY + (distanceAbove / 2);
        const midpointBelow = worldY - (distanceBelow / 2);
        
        distances.push({
            distance: distanceAbove,
            position: new THREE.Vector3(-config.width / 2 - 10, midpointAbove, config.depth / 2 + 5),
            toType: aboveType,
            toName: aboveName
        });
        
        distances.push({
            distance: distanceBelow,
            position: new THREE.Vector3(-config.width / 2 - 10, midpointBelow, config.depth / 2 + 5),
            toType: belowType,
            toName: belowName
        });
        
        return distances;
    }

    // Calculate distances for a vertical divider  
    calculateVerticalDividerDistances(
        hoveredDivider: DividerData,
        allVerticalDividers: DividerData[],
        config: ShelfConfig
    ): Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass', toName: string}> {
        const distances: Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass', toName: string}> = [];
        const thickness = config.materialThickness;
        const interiorWidth = config.width - (2 * thickness);
        const interiorHeight = config.height - (2 * thickness);
        
        // Sort dividers by position
        const sortedDividers = [...allVerticalDividers]
            .filter(d => d.id !== hoveredDivider.id)
            .sort((a, b) => a.position - b.position);
        
        const hoveredPosition = hoveredDivider.position;
        
        // Distance to divider to the right (or right carcass)
        const dividersRight = sortedDividers.filter(d => d.position > hoveredPosition);
        let distanceRight: number;
        let rightName: string;
        let rightType: 'divider' | 'carcass';
        
        if (dividersRight.length > 0) {
            const nextDivider = dividersRight[0];
            distanceRight = nextDivider.position - hoveredPosition;
            rightName = `Divider ${sortedDividers.indexOf(nextDivider) + 1}`;
            rightType = 'divider';
        } else {
            distanceRight = (interiorWidth / 2) - hoveredPosition;
            rightName = 'Right';
            rightType = 'carcass';
        }
        
        // Distance to divider to the left (or left carcass)
        const dividersLeft = sortedDividers.filter(d => d.position < hoveredPosition);
        let distanceLeft: number;
        let leftName: string;
        let leftType: 'divider' | 'carcass';
        
        if (dividersLeft.length > 0) {
            const prevDivider = dividersLeft[dividersLeft.length - 1];
            distanceLeft = hoveredPosition - prevDivider.position;
            leftName = `Divider ${sortedDividers.indexOf(prevDivider) + 1}`;
            leftType = 'divider';
        } else {
            distanceLeft = hoveredPosition - (-interiorWidth / 2);
            leftName = 'Left';
            leftType = 'carcass';
        }
        
        
        // Calculate 3D positions for labels
        const worldX = hoveredPosition;
        const worldY = thickness + (interiorHeight / 2);
        const midpointRight = worldX + (distanceRight / 2);
        const midpointLeft = worldX - (distanceLeft / 2);
        
        distances.push({
            distance: distanceRight,
            position: new THREE.Vector3(midpointRight, worldY + 20, config.depth / 2 + 5),
            toType: rightType,
            toName: rightName
        });
        
        distances.push({
            distance: distanceLeft,
            position: new THREE.Vector3(midpointLeft, worldY + 20, config.depth / 2 + 5),
            toType: leftType,
            toName: leftName
        });
        
        return distances;
    }

    // Show distance labels for a hovered divider
    showDistanceLabels(
        hoveredDivider: DividerData,
        horizontalDividers: DividerData[],
        verticalDividers: DividerData[],
        config: ShelfConfig,
        isDragging: boolean = false
    ) {
        console.log('🔥 showDistanceLabels called:', {
            hoveredDividerPosition: hoveredDivider.position,
            hoveredDividerType: hoveredDivider.type,
            isDragging,
            horizontalDividersCount: horizontalDividers.length,
            verticalDividersCount: verticalDividers.length
        });
        
        this.clearLabels();
        
        let distances: Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass', toName: string}>;
        
        if (hoveredDivider.type === 'horizontal') {
            // During dragging, use the live position but filter out the dragged divider from calculations
            const filteredHorizontalDividers = isDragging 
                ? horizontalDividers.filter(d => d.id !== hoveredDivider.id)
                : horizontalDividers;
            distances = this.calculateHorizontalDividerDistances(hoveredDivider, filteredHorizontalDividers, config);
        } else {
            // During dragging, use the live position but filter out the dragged divider from calculations  
            const filteredVerticalDividers = isDragging 
                ? verticalDividers.filter(d => d.id !== hoveredDivider.id)
                : verticalDividers;
            distances = this.calculateVerticalDividerDistances(hoveredDivider, filteredVerticalDividers, config);
        }
        
        distances.forEach((dist, index) => {
            this.createDistanceLabel(
                `${hoveredDivider.id}-${index}`,
                dist.distance,
                dist.position,
                dist.toName
            );
        });
    }

    private createDistanceLabel(id: string, distance: number, worldPosition: THREE.Vector3, toName: string) {
        // Create HTML label element
        const labelElement = document.createElement('div');
        labelElement.className = 'distance-label';
        labelElement.style.position = 'absolute';
        labelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        labelElement.style.color = 'white';
        labelElement.style.padding = '4px 8px';
        labelElement.style.borderRadius = '4px';
        labelElement.style.fontSize = '12px';
        labelElement.style.fontFamily = 'monospace';
        labelElement.style.pointerEvents = 'none';
        labelElement.style.zIndex = '1001';
        labelElement.style.whiteSpace = 'nowrap';
        labelElement.textContent = `${distance.toFixed(1)}cm to ${toName}`;
        
        // Convert 3D position to screen coordinates
        this.updateLabelPosition(labelElement, worldPosition);
        
        // Add to container
        const labelContainer = document.getElementById('distance-labels')!;
        labelContainer.appendChild(labelElement);
        
        // Store label
        this.labels.set(id, {
            id,
            distance,
            position: worldPosition,
            element: labelElement
        });
    }

    private updateLabelPosition(labelElement: HTMLElement, worldPosition: THREE.Vector3) {
        // Project 3D position to screen coordinates
        const screenPosition = worldPosition.clone().project(this.camera);
        
        // Convert to pixel coordinates
        const canvas = this.renderer.domElement;
        const x = (screenPosition.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (screenPosition.y * -0.5 + 0.5) * canvas.clientHeight;
        
        labelElement.style.left = `${x}px`;
        labelElement.style.top = `${y}px`;
        labelElement.style.transform = 'translate(-50%, -50%)';
    }

    // Update label positions when camera moves
    updateLabelPositions() {
        this.labels.forEach(label => {
            this.updateLabelPosition(label.element, label.position);
        });
    }

    // Clear all distance labels
    clearLabels() {
        this.labels.forEach(label => {
            if (label.element && label.element.parentNode) {
                label.element.parentNode.removeChild(label.element);
            }
            if (label.line) {
                this.scene.remove(label.line);
            }
        });
        this.labels.clear();
    }

    // Clean up
    dispose() {
        this.clearLabels();
        const labelContainer = document.getElementById('distance-labels');
        if (labelContainer) {
            labelContainer.remove();
        }
    }
}