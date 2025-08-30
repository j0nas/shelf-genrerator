import * as THREE from 'three';

interface DistanceLabel {
    id: string;
    distance: number;
    position: THREE.Vector3;
    screenPosition?: { x: number; y: number }; // Store final screen position to prevent jumping
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
    units?: 'metric' | 'imperial';
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
    ): Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass' | 'combined', toName: string, isCombined?: boolean}> {
        const distances: Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass' | 'combined', toName: string, isCombined?: boolean}> = [];
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
            distanceAbove = nextDivider.position - hoveredPosition - thickness;
            aboveName = `Divider ${sortedDividers.indexOf(nextDivider) + 1}`;
            aboveType = 'divider';
        } else {
            // Account for divider thickness when measuring to carcass
            distanceAbove = (interiorHeight - thickness/2) - hoveredPosition;
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
            distanceBelow = hoveredPosition - prevDivider.position - thickness;
            belowName = `Divider ${sortedDividers.indexOf(prevDivider) + 1}`;
            belowType = 'divider';
        } else {
            // Account for divider thickness when measuring to carcass
            distanceBelow = hoveredPosition - thickness/2;
            belowName = 'Bottom';
            belowType = 'carcass';
        }
        
        // Calculate 3D positions for labels with minimum separation
        const worldY = thickness + hoveredPosition;
        const midpointAbove = worldY + (distanceAbove / 2);
        const midpointBelow = worldY - (distanceBelow / 2);
        
        // Check screen space separation for horizontal labels too
        const abovePos3D = new THREE.Vector3(-config.width / 2 - 10, midpointAbove, config.depth / 2 + 5);
        const belowPos3D = new THREE.Vector3(-config.width / 2 - 10, midpointBelow, config.depth / 2 + 5);
        
        let screenSeparation = 1000; // Default to large separation if projection fails
        const minScreenSeparation = 100;
        
        try {
            const aboveScreen = abovePos3D.clone().project(this.camera);
            const belowScreen = belowPos3D.clone().project(this.camera);
            
            const canvas = this.renderer.domElement;
            const aboveX_screen = (aboveScreen.x * 0.5 + 0.5) * canvas.clientWidth;
            const aboveY_screen = (aboveScreen.y * -0.5 + 0.5) * canvas.clientHeight;
            const belowX_screen = (belowScreen.x * 0.5 + 0.5) * canvas.clientWidth;
            const belowY_screen = (belowScreen.y * -0.5 + 0.5) * canvas.clientHeight;
            
            screenSeparation = Math.sqrt(
                (aboveX_screen - belowX_screen) ** 2 + (aboveY_screen - belowY_screen) ** 2
            );
        } catch (error) {
            // Fallback to 3D separation
            const threeDSeparation = Math.abs(midpointAbove - midpointBelow);
            screenSeparation = threeDSeparation > 15 ? 1000 : 50;
        }
        
        let aboveY = midpointAbove;
        let belowY = midpointBelow;
        let aboveX = -config.width / 2 - 10;
        let belowX = -config.width / 2 - 10;
        
        if (screenSeparation < minScreenSeparation) {
            // If labels would be too close, combine them into a single label
            const combinedLabel = `${distanceBelow.toFixed(1)}cm to ${belowName} • ${distanceAbove.toFixed(1)}cm to ${aboveName}`;
            distances.push({
                distance: Math.min(distanceBelow, distanceAbove), // Use shorter distance for priority
                position: new THREE.Vector3(-config.width / 2 - 10, worldY, config.depth / 2 + 5),
                toType: 'combined' as any,
                toName: combinedLabel,
                isCombined: true
            });
        } else {
            distances.push({
                distance: distanceAbove,
                position: new THREE.Vector3(aboveX, aboveY, config.depth / 2 + 5),
                toType: aboveType,
                toName: aboveName
            });
            
            distances.push({
                distance: distanceBelow,
                position: new THREE.Vector3(belowX, belowY, config.depth / 2 + 5),
                toType: belowType,
                toName: belowName
            });
        }
        
        return distances;
    }

    // Calculate distances for a vertical divider  
    calculateVerticalDividerDistances(
        hoveredDivider: DividerData,
        allVerticalDividers: DividerData[],
        config: ShelfConfig
    ): Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass' | 'combined', toName: string, isCombined?: boolean}> {
        const distances: Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass' | 'combined', toName: string, isCombined?: boolean}> = [];
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
            distanceRight = nextDivider.position - hoveredPosition - thickness;
            rightName = `Divider ${sortedDividers.indexOf(nextDivider) + 1}`;
            rightType = 'divider';
        } else {
            // Account for divider thickness when measuring to carcass
            distanceRight = (interiorWidth / 2 - thickness/2) - hoveredPosition;
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
            distanceLeft = hoveredPosition - prevDivider.position - thickness;
            leftName = `Divider ${sortedDividers.indexOf(prevDivider) + 1}`;
            leftType = 'divider';
        } else {
            // Account for divider thickness when measuring to carcass
            distanceLeft = hoveredPosition - (-interiorWidth / 2 + thickness/2);
            leftName = 'Left';
            leftType = 'carcass';
        }
        
        
        // Calculate 3D positions for labels with minimum separation
        const worldX = hoveredPosition;
        const worldY = thickness + (interiorHeight / 2);
        const midpointRight = worldX + (distanceRight / 2);
        const midpointLeft = worldX - (distanceLeft / 2);
        
        // Check screen space separation instead of 3D separation
        const rightPos3D = new THREE.Vector3(midpointRight, worldY + 20, config.depth / 2 + 5);
        const leftPos3D = new THREE.Vector3(midpointLeft, worldY + 20, config.depth / 2 + 5);
        
        let screenSeparation = 1000; // Default to large separation (no combining) if projection fails
        const minScreenSeparation = 100; // minimum pixel separation on screen
        
        try {
            // Project to screen coordinates
            const rightScreen = rightPos3D.clone().project(this.camera);
            const leftScreen = leftPos3D.clone().project(this.camera);
            
            const canvas = this.renderer.domElement;
            const rightX_screen = (rightScreen.x * 0.5 + 0.5) * canvas.clientWidth;
            const rightY_screen = (rightScreen.y * -0.5 + 0.5) * canvas.clientHeight;
            const leftX_screen = (leftScreen.x * 0.5 + 0.5) * canvas.clientWidth;
            const leftY_screen = (leftScreen.y * -0.5 + 0.5) * canvas.clientHeight;
            
            screenSeparation = Math.sqrt(
                (rightX_screen - leftX_screen) ** 2 + (rightY_screen - leftY_screen) ** 2
            );
        } catch (error) {
            // Camera projection failed (likely in tests), use 3D separation as fallback
            const threeDSeparation = Math.abs(midpointRight - midpointLeft);
            screenSeparation = threeDSeparation > 15 ? 1000 : 50; // Convert to screen-like scale
        }
        
        let rightX = midpointRight;
        let leftX = midpointLeft;
        let rightY = worldY + 20;
        let leftY = worldY + 20;
        
        if (screenSeparation < minScreenSeparation) {
            // If labels would be too close, combine them into a single label
            const combinedLabel = `${distanceLeft.toFixed(1)}cm to ${leftName} • ${distanceRight.toFixed(1)}cm to ${rightName}`;
            distances.push({
                distance: Math.min(distanceLeft, distanceRight), // Use shorter distance for priority
                position: new THREE.Vector3(worldX, worldY + 20, config.depth / 2 + 5),
                toType: 'combined' as any,
                toName: combinedLabel,
                isCombined: true
            });
        } else {
            distances.push({
                distance: distanceRight,
                position: new THREE.Vector3(rightX, rightY, config.depth / 2 + 5),
                toType: rightType,
                toName: rightName
            });
            
            distances.push({
                distance: distanceLeft,
                position: new THREE.Vector3(leftX, leftY, config.depth / 2 + 5),
                toType: leftType,
                toName: leftName
            });
        }
        
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
        
        this.clearLabels();
        
        let distances: Array<{distance: number, position: THREE.Vector3, toType: 'divider' | 'carcass' | 'combined', toName: string, isCombined?: boolean}>;
        
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
        
        // Create labels in order, ensuring each one is positioned before creating the next
        for (let i = 0; i < distances.length; i++) {
            const dist = distances[i];
            this.createDistanceLabel(
                `${hoveredDivider.id}-${i}`,
                dist.distance,
                dist.position,
                dist.toName
            );
        }
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
        // Check if this is a combined label (toName already contains full text)
        labelElement.textContent = toName.includes('•') ? toName : `${distance.toFixed(1)}cm to ${toName}`;
        
        // Add to container first to get dimensions
        const labelContainer = document.getElementById('distance-labels')!;
        labelContainer.appendChild(labelElement);
        
        // Convert 3D position to screen coordinates with collision avoidance
        const adjustedScreenPos = this.updateLabelPositionWithCollisionAvoidance(labelElement, worldPosition);
        
        // Store label with final screen position
        this.labels.set(id, {
            id,
            distance,
            position: worldPosition,
            screenPosition: adjustedScreenPos,
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
    
    private updateLabelPositionWithCollisionAvoidance(labelElement: HTMLElement, worldPosition: THREE.Vector3) {
        // Project 3D position to screen coordinates
        const screenPosition = worldPosition.clone().project(this.camera);
        
        // Convert to pixel coordinates
        const canvas = this.renderer.domElement;
        let x = (screenPosition.x * 0.5 + 0.5) * canvas.clientWidth;
        let y = (screenPosition.y * -0.5 + 0.5) * canvas.clientHeight;
        
        // Get label dimensions
        const rect = labelElement.getBoundingClientRect();
        const labelWidth = rect.width || 150; // fallback width
        const labelHeight = rect.height || 30; // fallback height
        
        // Check for collisions with existing labels and adjust position
        const adjustedPosition = this.findNonOverlappingPosition(x, y, labelWidth, labelHeight);
        
        labelElement.style.left = `${adjustedPosition.x}px`;
        labelElement.style.top = `${adjustedPosition.y}px`;
        labelElement.style.transform = 'translate(-50%, -50%)';
        
        // Store the final screen position
        return adjustedPosition;
    }
    
    private findNonOverlappingPosition(x: number, y: number, width: number, height: number): {x: number, y: number} {
        const existingLabels = Array.from(this.labels.values());
        
        // Try the original position first
        if (!this.hasCollision(x, y, width, height, existingLabels)) {
            return { x, y };
        }
        
        
        // Try positions around the original with increasing distance
        const maxAttempts = 12;
        const angleStep = (Math.PI * 2) / maxAttempts;
        
        for (let distance = 50; distance <= 200; distance += 25) {
            for (let i = 0; i < maxAttempts; i++) {
                const angle = i * angleStep;
                const testX = x + Math.cos(angle) * distance;
                const testY = y + Math.sin(angle) * distance;
                
                // Keep within canvas bounds
                const canvas = this.renderer.domElement;
                if (testX - width/2 < 0 || testX + width/2 > canvas.clientWidth ||
                    testY - height/2 < 0 || testY + height/2 > canvas.clientHeight) {
                    continue;
                }
                
                if (!this.hasCollision(testX, testY, width, height, existingLabels)) {
                    return { x: testX, y: testY };
                }
            }
        }
        
        // Fallback to original position if no non-overlapping position found
        return { x, y };
    }
    
    private hasCollision(x: number, y: number, width: number, height: number, existingLabels: DistanceLabel[]): boolean {
        const padding = 12; // Increased padding for better separation
        
        for (const existingLabel of existingLabels) {
            if (!existingLabel.element.parentNode) continue; // Skip if element is not in DOM
            
            // Use stored screen position if available, otherwise calculate from DOM
            let existingX: number, existingY: number, existingWidth: number, existingHeight: number;
            
            if (existingLabel.screenPosition) {
                existingX = existingLabel.screenPosition.x;
                existingY = existingLabel.screenPosition.y;
                const rect = existingLabel.element.getBoundingClientRect();
                existingWidth = rect.width;
                existingHeight = rect.height;
            } else {
                const existingRect = existingLabel.element.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                existingX = existingRect.left - containerRect.left + existingRect.width / 2;
                existingY = existingRect.top - containerRect.top + existingRect.height / 2;
                existingWidth = existingRect.width;
                existingHeight = existingRect.height;
            }
            
            // Check if rectangles overlap (with padding)
            if (x - width/2 - padding < existingX + existingWidth/2 &&
                x + width/2 + padding > existingX - existingWidth/2 &&
                y - height/2 - padding < existingY + existingHeight/2 &&
                y + height/2 + padding > existingY - existingHeight/2) {
                return true;
            }
        }
        
        return false;
    }

    // Update label positions when camera moves
    updateLabelPositions() {
        // For each label, check if the 3D position has moved significantly
        // If not, keep the stored screen position to prevent jumping
        this.labels.forEach(label => {
            const screenPosition = label.position.clone().project(this.camera);
            const canvas = this.renderer.domElement;
            const newX = (screenPosition.x * 0.5 + 0.5) * canvas.clientWidth;
            const newY = (screenPosition.y * -0.5 + 0.5) * canvas.clientHeight;
            
            // If we have a stored screen position and the 3D projection hasn't moved much,
            // use the stored position to prevent jumping
            if (label.screenPosition) {
                const projectedX = newX;
                const projectedY = newY;
                const currentX = label.screenPosition.x;
                const currentY = label.screenPosition.y;
                
                // Only update if the projected position moved significantly (more than 20px)
                const distance = Math.sqrt((projectedX - currentX) ** 2 + (projectedY - currentY) ** 2);
                if (distance < 20) {
                    // Keep current position to prevent jumping
                    label.element.style.left = `${currentX}px`;
                    label.element.style.top = `${currentY}px`;
                    label.element.style.transform = 'translate(-50%, -50%)';
                    return;
                }
            }
            
            // Position moved significantly, update normally
            this.updateLabelPosition(label.element, label.position);
            
            // Update stored screen position
            label.screenPosition = { x: newX, y: newY };
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