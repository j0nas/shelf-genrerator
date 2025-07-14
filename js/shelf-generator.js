import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ShelfGenerator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.shelfGroup = null;
        this.container = null;
    }
    
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container element not found:', containerId);
            return;
        }
        
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
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
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 200;
        this.controls.maxPolarAngle = Math.PI / 2;
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
    
    updateShelf(config) {
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
        
        if (config.adjustableShelves) {
            this.addShelfHoles(config);
        }
        
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
    
    addShelfHoles(config) {
        const holeGeometry = new THREE.CylinderGeometry(0.125, 0.125, config.materialThickness + 0.1, 8);
        const holeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const sides = [-config.width / 2 + config.materialThickness / 2, config.width / 2 - config.materialThickness / 2];
        
        sides.forEach(x => {
            for (let y = config.materialThickness + 2; y < config.height - config.materialThickness - 2; y += 1.25) {
                const hole = new THREE.Mesh(holeGeometry, holeMaterial);
                hole.position.set(x, y, config.depth / 4);
                hole.rotation.x = Math.PI / 2;
                this.shelfGroup.add(hole);
                
                const hole2 = new THREE.Mesh(holeGeometry, holeMaterial);
                hole2.position.set(x, y, -config.depth / 4);
                hole2.rotation.x = Math.PI / 2;
                this.shelfGroup.add(hole2);
            }
        });
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