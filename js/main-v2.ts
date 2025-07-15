// @ts-nocheck
import { DividerSystem } from './divider-system.js';
import { CutListGenerator } from './cutlist-generator.js';
import { UI } from './ui.js';
import { getElement, querySelector, getInputValue, getSelectValue, getCheckboxChecked, asInput, asSelect, asChecked } from './dom-utils.js';
import { ShelfConfig } from './types.js';

// Clean version of App using the new XState architecture
export class AppV2 {
    dividerSystem: DividerSystem;
    cutListGenerator: CutListGenerator;
    ui: UI;
    currentConfig: ShelfConfig;

    constructor() {
        this.cutListGenerator = new CutListGenerator();
        this.ui = new UI();
        
        this.currentConfig = {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            materialType: 'plywood',
            shelfLayout: [], // Will be managed by DividerSystem
            verticalDividers: [], // Will be managed by DividerSystem
            backPanel: false,
            edgeTreatment: 'none',
            woodGrain: true,
            units: 'imperial' as const
        };
        
        this.init();
    }
    
    init(): void {
        this.setupEventListeners();
        
        // Initialize the clean divider system
        this.dividerSystem = new DividerSystem('three-canvas');
        
        // Check the actual state of the units radio button
        const checkedUnitInput = querySelector<HTMLInputElement>('input[name="units"]:checked');
        if (checkedUnitInput) {
            this.currentConfig.units = checkedUnitInput.value as 'metric' | 'imperial';
        }
        
        // Update shelf configuration in the divider system
        this.updateDividerSystem();
        
        // Initial render
        this.generateCutList();
        
        // Make accessible globally for debugging
        window.app = this;
        
        console.log('✅ Clean App V2 initialized with XState architecture');
    }
    
    setupEventListeners(): void {
        // Width
        const widthInput = getElement('shelf-width') as HTMLInputElement;
        widthInput.addEventListener('input', () => {
            this.currentConfig.width = parseFloat(getInputValue('shelf-width'));
            this.updateDividerSystem();
            this.generateCutList();
        });

        // Height  
        const heightInput = getElement('shelf-height') as HTMLInputElement;
        heightInput.addEventListener('input', () => {
            this.currentConfig.height = parseFloat(getInputValue('shelf-height'));
            this.updateDividerSystem();
            this.generateCutList();
        });

        // Depth
        const depthInput = getElement('shelf-depth') as HTMLInputElement;
        depthInput.addEventListener('input', () => {
            this.currentConfig.depth = parseFloat(getInputValue('shelf-depth'));
            this.updateDividerSystem();
            this.generateCutList();
        });

        // Material thickness
        const thicknessInput = getElement('material-thickness') as HTMLInputElement;
        thicknessInput.addEventListener('input', () => {
            this.currentConfig.materialThickness = parseFloat(getInputValue('material-thickness'));
            this.updateDividerSystem();
            this.generateCutList();
        });

        // Material type
        const materialSelect = getElement('material-type') as HTMLSelectElement;
        materialSelect.addEventListener('change', () => {
            this.currentConfig.materialType = getSelectValue('material-type');
            this.updateDividerSystem();
            this.generateCutList();
        });

        // Back panel
        const backPanelInput = getElement('back-panel') as HTMLInputElement;
        backPanelInput.addEventListener('change', () => {
            this.currentConfig.backPanel = getCheckboxChecked('back-panel');
            this.updateDividerSystem();
            this.generateCutList();
        });

        // Wood grain
        const woodGrainInput = getElement('wood-grain') as HTMLInputElement;
        woodGrainInput.addEventListener('change', () => {
            this.currentConfig.woodGrain = getCheckboxChecked('wood-grain');
            this.updateDividerSystem();
        });

        // Edge treatment
        const edgeTreatmentSelect = getElement('edge-treatment') as HTMLSelectElement;
        edgeTreatmentSelect.addEventListener('change', () => {
            this.currentConfig.edgeTreatment = getSelectValue('edge-treatment');
            this.generateCutList();
        });

        // Units
        const unitInputs = document.querySelectorAll('input[name="units"]');
        unitInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.checked) {
                    this.currentConfig.units = target.value as 'metric' | 'imperial';
                    this.updateDividerSystem();
                    this.generateCutList();
                }
            });
        });

        // Cut list generation
        const generateButton = getElement('generate-cutlist');
        if (generateButton) {
            generateButton.addEventListener('click', () => this.generateCutList());
        }

        // PDF export
        const exportButton = getElement('export-pdf');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportPDF());
        }

        // Reset button
        const resetButton = getElement('reset-shelf');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.reset());
        }

        // Debug toggle
        const debugButton = getElement('debug-toggle');
        if (debugButton) {
            debugButton.addEventListener('click', () => this.toggleDebugMode());
        }
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
    
    generateCutList(): void {
        // Get current dividers from the system
        const dividers = this.getCurrentDividers();
        
        // Update config with current dividers for cut list generation
        const configForCutList = {
            ...this.currentConfig,
            shelfLayout: dividers.horizontal,
            verticalDividers: dividers.vertical
        };
        
        const cutList = (this.cutListGenerator as any).generate(configForCutList);
        (this.ui as any).displayCutList(cutList, configForCutList);
    }
    
    exportPDF(): void {
        const dividers = this.getCurrentDividers();
        const configForExport = {
            ...this.currentConfig,
            shelfLayout: dividers.horizontal,
            verticalDividers: dividers.vertical
        };
        
        const cutList = (this.cutListGenerator as any).generate(configForExport);
        (this.ui as any).exportToPDF(cutList, configForExport);
    }
    
    reset(): void {
        // Reset the configuration
        this.currentConfig = {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            materialType: 'plywood',
            shelfLayout: [],
            verticalDividers: [],
            backPanel: false,
            edgeTreatment: 'none',
            woodGrain: true,
            units: 'imperial' as const
        };
        
        // Reset the divider system
        this.dividerSystem.reset();
        
        // Update UI
        this.updateUIFromConfig();
        this.generateCutList();
        
        console.log('✅ Shelf reset to default configuration');
    }
    
    updateUIFromConfig(): void {
        // Update form inputs to match config
        (getElement('shelf-width') as HTMLInputElement).value = this.currentConfig.width.toString();
        (getElement('shelf-height') as HTMLInputElement).value = this.currentConfig.height.toString();
        (getElement('shelf-depth') as HTMLInputElement).value = this.currentConfig.depth.toString();
        (getElement('material-thickness') as HTMLInputElement).value = this.currentConfig.materialThickness.toString();
        (getElement('material-type') as HTMLSelectElement).value = this.currentConfig.materialType;
        (getElement('back-panel') as HTMLInputElement).checked = this.currentConfig.backPanel;
        (getElement('wood-grain') as HTMLInputElement).checked = this.currentConfig.woodGrain;
        (getElement('edge-treatment') as HTMLSelectElement).value = this.currentConfig.edgeTreatment;
        
        // Update units radio buttons
        const unitInput = querySelector<HTMLInputElement>(`input[name="units"][value="${this.currentConfig.units}"]`);
        if (unitInput) {
            unitInput.checked = true;
        }
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
    renderShelfLayoutControls(): void {
        // Not needed in clean architecture - state is managed by DividerSystem
        console.log('📝 renderShelfLayoutControls called - handled by DividerSystem');
    }
    
    // Debug method to inspect current state
    getSystemState() {
        return {
            config: this.currentConfig,
            dividerSystemState: this.dividerSystem ? this.dividerSystem.getState() : null,
            dividers: this.getCurrentDividers()
        };
    }
}