import { DividerSystem } from './divider-system.js';
import { getElement, getInputValue, getSelectValue, getCheckboxChecked } from './dom-utils.js';
import { ShelfConfig } from './types.js';

// Clean version of App using the new XState architecture
export class App {
    dividerSystem: DividerSystem;
    currentConfig: ShelfConfig;

    constructor() {
        
        this.currentConfig = {
            width: 91,
            height: 183,
            depth: 30,
            materialThickness: 1.8,
            materialType: 'plywood',
            shelfLayout: [], // Will be managed by DividerSystem
            verticalDividers: [], // Will be managed by DividerSystem
            backPanel: false,
            edgeTreatment: 'none',
            woodGrain: true
        };
        
        this.init();
    }
    
    init(): void {
        this.setupEventListeners();
        
        // Initialize the clean divider system
        this.dividerSystem = new DividerSystem('three-canvas');
        
        
        // Update shelf configuration in the divider system
        this.updateDividerSystem();
        
        // Initial render
        
        // Make accessible globally for debugging
        (window as any).app = this;
        
        console.log('✅ Clean App V2 initialized with XState architecture');
    }
    
    setupEventListeners(): void {
        // Width
        const widthInput = getElement('width') as HTMLInputElement;
        widthInput.addEventListener('input', (event) => {
            this.currentConfig.width = parseFloat(getInputValue(event));
            this.updateDividerSystem();
        });

        // Height  
        const heightInput = getElement('height') as HTMLInputElement;
        heightInput.addEventListener('input', (event) => {
            this.currentConfig.height = parseFloat(getInputValue(event));
            this.updateDividerSystem();
        });

        // Depth
        const depthInput = getElement('depth') as HTMLInputElement;
        depthInput.addEventListener('input', (event) => {
            this.currentConfig.depth = parseFloat(getInputValue(event));
            this.updateDividerSystem();
        });

        // Material thickness
        const thicknessInput = getElement('material-thickness') as HTMLInputElement;
        thicknessInput.addEventListener('input', (event) => {
            this.currentConfig.materialThickness = parseFloat(getInputValue(event));
            this.updateDividerSystem();
        });

        // Material type
        const materialSelect = getElement('material-type') as HTMLSelectElement;
        materialSelect.addEventListener('change', (event) => {
            this.currentConfig.materialType = getSelectValue(event);
            this.updateDividerSystem();
        });

        // Back panel
        const backPanelInput = getElement('back-panel') as HTMLInputElement;
        backPanelInput.addEventListener('change', (event) => {
            this.currentConfig.backPanel = getCheckboxChecked(event);
            this.updateDividerSystem();
        });

        // Wood grain
        const woodGrainInput = getElement('wood-grain') as HTMLInputElement;
        woodGrainInput.addEventListener('change', (event) => {
            this.currentConfig.woodGrain = getCheckboxChecked(event);
            this.updateDividerSystem();
        });

        // Edge treatment
        const edgeTreatmentSelect = getElement('edge-treatment') as HTMLSelectElement;
        edgeTreatmentSelect.addEventListener('change', (event) => {
            this.currentConfig.edgeTreatment = getSelectValue(event);
        });



        // PDF export
        const exportButton = getElement('export-pdf');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportPDF());
        }

        // Reset button
        const resetButton = getElement('reset');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.reset());
        }

        // Debug toggle
        const debugButton = getElement('debug-toggle');
        if (debugButton) {
            debugButton.addEventListener('click', () => this.toggleDebugMode());
        }

        // Camera view buttons
        this.setupCameraViewButtons();
    }
    
    setupCameraViewButtons(): void {
        // Front view button
        const frontButton = getElement('view-front');
        if (frontButton) {
            frontButton.addEventListener('click', () => {
                if (this.dividerSystem) {
                    this.dividerSystem.setFrontView();
                    this.setActiveViewButton('view-front');
                }
            });
        }

        // Side view button
        const sideButton = getElement('view-side');
        if (sideButton) {
            sideButton.addEventListener('click', () => {
                if (this.dividerSystem) {
                    this.dividerSystem.setSideView();
                    this.setActiveViewButton('view-side');
                }
            });
        }

        // Top view button
        const topButton = getElement('view-top');
        if (topButton) {
            topButton.addEventListener('click', () => {
                if (this.dividerSystem) {
                    this.dividerSystem.setTopView();
                    this.setActiveViewButton('view-top');
                }
            });
        }

        // Isometric view button
        const isoButton = getElement('view-iso');
        if (isoButton) {
            isoButton.addEventListener('click', () => {
                if (this.dividerSystem) {
                    this.dividerSystem.setIsometricView();
                    this.setActiveViewButton('view-iso');
                }
            });
        }

        // Set front view as default
        this.setActiveViewButton('view-front');
    }
    
    setActiveViewButton(activeId: string): void {
        const viewButtons = ['view-front', 'view-side', 'view-top', 'view-iso'];
        
        viewButtons.forEach(buttonId => {
            const button = getElement(buttonId);
            if (button) {
                if (buttonId === activeId) {
                    button.classList.add('active');
                    button.style.backgroundColor = '#8B4513';
                    button.style.opacity = '1';
                } else {
                    button.classList.remove('active');
                    button.style.backgroundColor = '#666';
                    button.style.opacity = '0.7';
                }
            }
        });
    }
    
    updateDividerSystem(): void {
        if (this.dividerSystem) {
            this.dividerSystem.updateShelfConfig(this.currentConfig);
        }
    }
    
    // Get current dividers from the divider system
    getCurrentDividers() {
        if (!this.dividerSystem) return { horizontal: [], vertical: [] };
        return this.dividerSystem.getAllDividers();
    }
    
    
    exportPDF(): void {
        const dividers = this.getCurrentDividers();
        const configForExport = {
            ...this.currentConfig,
            shelfLayout: dividers.horizontal,
            verticalDividers: dividers.vertical
        };
        
        // Cut list generation disabled for now
        console.log('PDF export disabled until cut list is reimplemented');
    }
    
    reset(): void {
        // Reset the configuration
        this.currentConfig = {
            width: 91,
            height: 183,
            depth: 30,
            materialThickness: 1.8,
            materialType: 'plywood',
            shelfLayout: [],
            verticalDividers: [],
            backPanel: false,
            edgeTreatment: 'none',
            woodGrain: true
        };
        
        // Reset the divider system
        this.dividerSystem.reset();
        
        // Update UI
        this.updateUIFromConfig();
        
        console.log('✅ Shelf reset to default configuration');
    }
    
    updateUIFromConfig(): void {
        // Update form inputs to match config
        (getElement('width') as HTMLInputElement).value = this.currentConfig.width.toString();
        (getElement('height') as HTMLInputElement).value = this.currentConfig.height.toString();
        (getElement('depth') as HTMLInputElement).value = this.currentConfig.depth.toString();
        (getElement('material-thickness') as HTMLInputElement).value = this.currentConfig.materialThickness.toString();
        (getElement('material-type') as HTMLSelectElement).value = this.currentConfig.materialType;
        (getElement('back-panel') as HTMLInputElement).checked = this.currentConfig.backPanel;
        (getElement('wood-grain') as HTMLInputElement).checked = this.currentConfig.woodGrain;
        (getElement('edge-treatment') as HTMLSelectElement).value = this.currentConfig.edgeTreatment;
    }
    
    toggleDebugMode() {
        if (this.dividerSystem) {
            this.dividerSystem.enableDebugMode();
            
            const button = document.getElementById('debug-toggle');
            if (button) {
                button.textContent = 'Debug ON';
                button.style.backgroundColor = '#ff4757';
            }
        }
    }
    
    // Helper method for calculating interior height (used by cut list)
    getInteriorHeight(): number {
        return this.currentConfig.height - (2 * this.currentConfig.materialThickness);
    }
    
    // Helper method for calculating interior width
    getInteriorWidth(): number {
        return this.currentConfig.width - (2 * this.currentConfig.materialThickness);
    }
    
    // Legacy compatibility methods (for any remaining old code)
    // renderShelfLayoutControls() removed - no longer needed with clean architecture
    
    // Debug method to inspect current state
    getSystemState() {
        return {
            config: this.currentConfig,
            dividerSystemState: this.dividerSystem ? this.dividerSystem.getState() : null,
            dividers: this.getCurrentDividers()
        };
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Clean XState Shelf Generator...');
    new App();
});