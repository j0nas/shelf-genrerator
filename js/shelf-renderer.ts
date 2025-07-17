import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MaterialManager } from "./material-manager.js";
import { DistanceLabelManager } from "./distance-labels.js";

// Pure view layer - renders 3D scene based on state machine state
export class ShelfRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  shelfGroup: THREE.Group;
  container: HTMLElement;

  // Cached objects for efficiency
  dividerMeshes: Map<string, THREE.Mesh> = new Map();
  ghostDivider: THREE.Mesh | null = null;
  verticalGhostDivider: THREE.Mesh | null = null;
  distanceLabelManager: DistanceLabelManager;

  // Private properties
  private _currentShelfConfig: any;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.init();
  }

  init() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.setupLighting();
    this.setupDistanceLabels();

    // Set default view after controls are initialized
    this.setFrontView();

    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
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
    // Initial position - will be set to front view after controls are ready
    this.camera.position.set(0, 0, 100);
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
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.panSpeed = 1.0;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 200;
    this.controls.zoomSpeed = 5.0;
    this.controls.rotateSpeed = 0.8;
    this.controls.maxPolarAngle = Math.PI / 2;

    this.controls.keys = {
      LEFT: "ArrowLeft",
      UP: "ArrowUp",
      RIGHT: "ArrowRight",
      BOTTOM: "ArrowDown",
    };

    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
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

  setupDistanceLabels() {
    this.distanceLabelManager = new DistanceLabelManager(this.container, this.camera, this.renderer, this.scene);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.distanceLabelManager.updateLabelPositions();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  // Pure render method - updates scene based on state
  render(state: any) {
    if (!state.context.shelfConfig) return;

    this.renderShelfStructure(state.context.shelfConfig);
    this.renderDividers(state.context);
    this.renderGhostDivider(state.context.ghostDivider, state.context.shelfConfig);
    this.renderSelectionHighlight(state.context.selectedDivider);
    this.renderHoverHighlight(state.context.hoveredDivider);
    this.renderDistanceLabels(state.context);
    this.updateCameraControls(state.context.isDragging);
  }

  renderShelfStructure(config: any) {
    // Clear existing shelf structure
    this.shelfGroup.children.forEach((child) => {
      if (child.userData.type === "shelf-structure") {
        this.shelfGroup.remove(child);
        MaterialManager.disposeMesh(child);
      }
    });

    const materials = MaterialManager.createMaterials(config.materialType);
    const shelfStructure = this.createShelfStructure(config, materials);
    shelfStructure.userData.type = "shelf-structure";
    this.shelfGroup.add(shelfStructure);
    this.centerShelf();
  }

  renderDividers(context: any) {
    const allDividers = [...context.horizontalDividers, ...context.verticalDividers];
    const currentDividerIds = new Set(allDividers.map((d) => d.id));

    // Remove dividers that no longer exist
    for (const [id, mesh] of this.dividerMeshes) {
      if (!currentDividerIds.has(id)) {
        this.shelfGroup.remove(mesh);
        MaterialManager.disposeMesh(mesh);
        this.dividerMeshes.delete(id);
      }
    }

    // Add or update dividers
    const materials = MaterialManager.createMaterials(context.shelfConfig.materialType);

    for (const divider of allDividers) {
      let mesh = this.dividerMeshes.get(divider.id);

      if (!mesh) {
        mesh = this.createDividerMesh(divider, context.shelfConfig, materials);
        this.dividerMeshes.set(divider.id, mesh);
        this.shelfGroup.add(mesh);
      } else {
        this.updateDividerPosition(mesh, divider, context.shelfConfig);
      }
    }
  }

  createDividerMesh(divider: any, config: any, materials: any): THREE.Mesh {
    const thickness = config.materialThickness;
    const interiorHeight = config.height - 2 * thickness;
    const interiorWidth = config.width - 2 * thickness;
    const depth = config.depth;

    let geometry: THREE.BoxGeometry;

    if (divider.type === "horizontal") {
      geometry = new THREE.BoxGeometry(interiorWidth, thickness, depth);
    } else {
      geometry = new THREE.BoxGeometry(thickness, interiorHeight, depth);
    }

    const mesh = new THREE.Mesh(geometry, materials.edge.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      type: `${divider.type}-divider`,
      dividerId: divider.id,
      position: divider.position,
      dividerType: divider.type,
    };

    this.updateDividerPosition(mesh, divider, config);

    return mesh;
  }

  updateDividerPosition(mesh: THREE.Mesh, divider: any, config: any) {
    const thickness = config.materialThickness;
    const interiorHeight = config.height - 2 * thickness;

    if (divider.type === "horizontal") {
      mesh.position.set(0, thickness + divider.position, 0);
    } else {
      mesh.position.set(divider.position, thickness + interiorHeight / 2, 0);
    }

    // Update userData position to keep it in sync with the logical position
    if (mesh.userData) {
      mesh.userData.position = divider.position;
    }
  }

  renderGhostDivider(ghostDivider: any, config: any) {
    // Hide all ghost dividers first
    if (this.ghostDivider) this.ghostDivider.visible = false;
    if (this.verticalGhostDivider) this.verticalGhostDivider.visible = false;

    if (!ghostDivider || !ghostDivider.visible) return;

    if (ghostDivider.type === "horizontal") {
      if (!this.ghostDivider) {
        this.ghostDivider = this.createHorizontalGhostDivider(config);
        this.shelfGroup.add(this.ghostDivider);
      }

      this.ghostDivider.position.y = config.materialThickness + ghostDivider.position;
      this.ghostDivider.visible = true;
    } else {
      if (!this.verticalGhostDivider) {
        this.verticalGhostDivider = this.createVerticalGhostDivider(config);
        this.shelfGroup.add(this.verticalGhostDivider);
      }

      const interiorHeight = config.height - 2 * config.materialThickness;
      this.verticalGhostDivider.position.set(
        ghostDivider.positionX,
        config.materialThickness + interiorHeight / 2,
        0.1
      );
      this.verticalGhostDivider.visible = true;
    }
  }

  createHorizontalGhostDivider(config: any): THREE.Mesh {
    const thickness = config.materialThickness;
    const width = config.width - thickness;
    const depth = config.depth;

    const geometry = new THREE.BoxGeometry(width, thickness, depth);
    const material = MaterialManager.createGhostMaterial(0x00ff00);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 999;
    mesh.visible = false;

    return mesh;
  }

  createVerticalGhostDivider(config: any): THREE.Mesh {
    const thickness = config.materialThickness;
    const interiorHeight = config.height - 2 * thickness;
    const depth = config.depth;

    const geometry = new THREE.BoxGeometry(thickness, interiorHeight, depth);
    const material = MaterialManager.createGhostMaterial(0x00ff99);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 999;
    mesh.visible = false;

    return mesh;
  }

  renderSelectionHighlight(selectedDivider: any) {
    this.renderHighlight(selectedDivider, "selection-highlight", 0xff0000, 0.3, 1.02, 998);
  }

  renderHoverHighlight(hoveredDivider: any) {
    this.renderHighlight(hoveredDivider, "hover-highlight", 0xffff00, 0.2, 1.01, 997);
  }

  renderDistanceLabels(context: any) {
    // Show distance labels for selected divider during drag, otherwise hovered divider
    const targetDivider =
      (context.isDragging && context.selectedDivider ? context.selectedDivider : null) || context.hoveredDivider;

    if (targetDivider && context.shelfConfig) {
      this.distanceLabelManager.showDistanceLabels(
        targetDivider,
        context.horizontalDividers,
        context.verticalDividers,
        context.shelfConfig,
        context.isDragging && context.selectedDivider === targetDivider
      );
    } else {
      this.distanceLabelManager.clearLabels();
    }
  }

  private renderHighlight(
    divider: any,
    highlightType: string,
    color: number,
    opacity: number,
    scale: number,
    renderOrder: number
  ) {
    // Clear existing highlights of this type
    this.shelfGroup.children.forEach((child) => {
      if (child.userData.type === highlightType) {
        this.shelfGroup.remove(child);
        MaterialManager.disposeMesh(child);
      }
    });

    if (!divider) return;

    const mesh = this.dividerMeshes.get(divider.id);
    if (!mesh) return;

    // Create highlight
    const highlightGeometry = mesh.geometry.clone();
    const highlightMaterial = MaterialManager.createHighlightMaterial(color, opacity);

    const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight.position.copy(mesh.position);
    highlight.scale.setScalar(scale);
    highlight.userData.type = highlightType;
    highlight.renderOrder = renderOrder;

    this.shelfGroup.add(highlight);
  }

  updateCameraControls(isDragging: boolean) {
    this.controls.enabled = !isDragging;
  }

  createShelfStructure(config: any, materials: any): THREE.Group {
    const group = new THREE.Group();
    const thickness = config.materialThickness;

    // Create sides
    const sideGeometry = new THREE.BoxGeometry(thickness, config.height, config.depth);

    const leftSide = new THREE.Mesh(sideGeometry, materials.main.clone());
    leftSide.position.set(-config.width / 2 + thickness / 2, config.height / 2, 0);
    leftSide.castShadow = true;
    leftSide.receiveShadow = true;
    leftSide.userData.type = "shelf-panel";
    leftSide.userData.panelType = "side";

    const rightSide = new THREE.Mesh(sideGeometry, materials.main.clone());
    rightSide.position.set(config.width / 2 - thickness / 2, config.height / 2, 0);
    rightSide.castShadow = true;
    rightSide.receiveShadow = true;
    rightSide.userData.type = "shelf-panel";
    rightSide.userData.panelType = "side";

    // Create top and bottom
    const shelfGeometry = new THREE.BoxGeometry(config.width, thickness, config.depth);

    const topShelf = new THREE.Mesh(shelfGeometry, materials.main.clone());
    topShelf.position.set(0, config.height - thickness / 2, 0);
    topShelf.castShadow = true;
    topShelf.receiveShadow = true;
    topShelf.userData.type = "shelf-panel";
    topShelf.userData.panelType = "top";

    const bottomShelf = new THREE.Mesh(shelfGeometry, materials.main.clone());
    bottomShelf.position.set(0, thickness / 2, 0);
    bottomShelf.castShadow = true;
    bottomShelf.receiveShadow = true;
    bottomShelf.userData.type = "shelf-panel";
    bottomShelf.userData.panelType = "bottom";

    group.add(leftSide);
    group.add(rightSide);
    group.add(topShelf);
    group.add(bottomShelf);

    // Add back panel if enabled
    if (config.backPanel) {
      const backGeometry = new THREE.BoxGeometry(config.width, config.height, thickness);
      const backPanel = new THREE.Mesh(backGeometry, materials.main.clone());
      backPanel.position.set(0, config.height / 2, -config.depth / 2 + thickness / 2);
      backPanel.castShadow = true;
      backPanel.receiveShadow = true;
      backPanel.userData.type = "shelf-panel";
      backPanel.userData.panelType = "back";
      group.add(backPanel);
    }

    return group;
  }

  centerShelf() {
    this.shelfGroup.position.set(0, 0, 0);
  }

  // Input handling - converts DOM events to normalized coordinates
  getMousePosition(event: MouseEvent): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  // Raycasting for mouse interaction
  getShelfIntersection(mouseX: number, mouseY: number): any {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

    // Create virtual plane for intersection
    const shelfConfig = this.getCurrentShelfConfig();
    if (!shelfConfig) return null;

    const thickness = shelfConfig.materialThickness;
    const interiorHeight = shelfConfig.height - 2 * thickness;
    const interiorWidth = shelfConfig.width - 2 * thickness;

    const planeGeometry = new THREE.PlaneGeometry(interiorWidth, interiorHeight);
    const planeMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    const intersectionPlane = new THREE.Mesh(planeGeometry, planeMaterial);

    intersectionPlane.position.set(0, thickness + interiorHeight / 2, shelfConfig.depth / 2);
    intersectionPlane.lookAt(0, thickness + interiorHeight / 2, shelfConfig.depth / 2 + 100);

    const intersects = raycaster.intersectObject(intersectionPlane);

    planeGeometry.dispose();
    planeMaterial.dispose();

    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const worldPoint = hit.point;

    const positionY = worldPoint.y - thickness;
    const positionX = worldPoint.x;

    if (
      positionY >= 0 &&
      positionY <= interiorHeight &&
      positionX >= -interiorWidth / 2 &&
      positionX <= interiorWidth / 2
    ) {
      return {
        positionY,
        positionX,
        worldPoint,
      };
    }

    return null;
  }

  getCurrentShelfConfig(): any {
    // This will be set by the controller
    return this._currentShelfConfig;
  }

  setShelfConfig(config: any) {
    this._currentShelfConfig = config;
  }

  // Get divider at mouse position
  getDividerAtPosition(mouseX: number, mouseY: number): any {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

    const intersects = raycaster.intersectObjects([...this.dividerMeshes.values()]);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      return {
        id: mesh.userData.dividerId,
        type: mesh.userData.dividerType,
        position: mesh.userData.position,
        mesh: mesh,
      };
    }

    return null;
  }

  // Camera view methods
  setFrontView() {
    this.setCameraView("front");
  }

  setSideView() {
    this.setCameraView("side");
  }

  setTopView() {
    this.setCameraView("top");
  }

  setIsometricView() {
    this.setCameraView("isometric");
  }

  private setCameraView(viewType: "front" | "side" | "top" | "isometric") {
    const config = this.getCurrentShelfConfig();
    let distance: number;
    let position: [number, number, number];

    // Camera should be positioned at shelf center height for proper front view
    const cameraHeight = config ? config.height / 2 : 0;
    // Look at a point slightly higher than center for better visual framing  
    const lookAtHeight = config ? config.height * 0.6 : 0;
    switch (viewType) {
      case "front":
        distance = config ? Math.max(config.width, config.height) * 2.5 : 150;
        position = [0, cameraHeight, distance];
        break;
      case "side":
        distance = config ? Math.max(config.depth, config.height) * 2.5 : 150;
        position = [distance, cameraHeight, 0];
        break;
      case "top":
        distance = config ? Math.max(config.width, config.depth) * 2.5 : 150;
        position = [0, cameraHeight + distance, 0];
        break;
      case "isometric":
        distance = config ? Math.max(config.width, config.height, config.depth) * 2.0 : 150;
        position = [distance * 0.7, cameraHeight + distance * 0.7, distance * 0.7];
        break;
    }

    this.camera.position.set(...position);
    this.camera.lookAt(0, lookAtHeight, 0);
    this.controls.target.set(0, lookAtHeight, 0);
    this.controls.update();
  }

  // Check if mouse is over shelf panels (to disable ghost dividers)
  isMouseOverPanel(mouseX: number, mouseY: number): boolean {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

    // Get all shelf panel objects
    const shelfPanels: THREE.Object3D[] = [];
    this.shelfGroup.traverse((child) => {
      if (child.userData.type === "shelf-panel" && child instanceof THREE.Mesh) {
        shelfPanels.push(child);
      }
    });

    const intersects = raycaster.intersectObjects(shelfPanels);
    return intersects.length > 0;
  }
}
