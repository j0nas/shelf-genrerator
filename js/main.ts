// @ts-nocheck
import { ShelfGenerator } from './shelf-generator.js';
import { CutListGenerator } from './cutlist-generator.js';
import { UI } from './ui.js';
import { testStateMachine } from './state-machine-test.js';
import { getElement, querySelector, getInputValue, getSelectValue, getCheckboxChecked, asInput, asSelect, asChecked } from './dom-utils.js';
import { ShelfConfig, DividerInfo } from './types.js';

// Update global Window interface
declare global {
    interface Window {
        app: App;
    }
}

export class App {
    shelfGenerator: ShelfGenerator;
    cutListGenerator: CutListGenerator;
    ui: UI;
    currentConfig: ShelfConfig;

    constructor() {
        this.shelfGenerator = new ShelfGenerator();
        this.cutListGenerator = new CutListGenerator();
        this.ui = new UI();
        
        this.currentConfig = {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            materialType: 'plywood',
            shelfLayout: [] as DividerInfo[], // Array of horizontal dividers
            verticalDividers: [] as import('./types.js').VerticalDividerInfo[], // Array of vertical dividers
            backPanel: false,
            edgeTreatment: 'none',
            woodGrain: true,
            units: 'imperial' as const
        };
        
        this.init();
    }
    
    
    init(): void {
        this.setupEventListeners();
        this.shelfGenerator.init('three-canvas');
        
        // Check the actual state of the units radio button
        const checkedUnitInput = querySelector<HTMLInputElement>('input[name="units"]:checked');
        const selectedUnit = checkedUnitInput?.value || 'imperial';
        
        // If the selected unit doesn't match our config, update the config
        if (selectedUnit !== this.currentConfig.units) {
            // Update the config to match the UI without triggering conversions
            this.currentConfig.units = selectedUnit as 'imperial' | 'metric';
            
            // If metric is selected, convert the default imperial values to metric
            if (selectedUnit === 'metric') {
                this.currentConfig.width = Math.round(this.inchesToCm(this.currentConfig.width) * 10) / 10;
                this.currentConfig.height = Math.round(this.inchesToCm(this.currentConfig.height) * 10) / 10;
                this.currentConfig.depth = Math.round(this.inchesToCm(this.currentConfig.depth) * 10) / 10;
                this.currentConfig.materialThickness = this.inchesToCm(this.currentConfig.materialThickness);
                
                // Convert divider positions to metric
                this.currentConfig.shelfLayout.forEach(divider => {
                    divider.position = Math.round(this.inchesToCm(divider.position) * 10) / 10;
                });
            }
        }
        
        // Update UI to match the config
        this.updateLabels(selectedUnit);
        this.updateThicknessOptions(selectedUnit);
        
        // Update input limits based on unit
        if (selectedUnit === 'metric') {
            // Update limits for metric
            const widthInput = getElement<HTMLInputElement>('width');
            const heightInput = getElement<HTMLInputElement>('height');
            const depthInput = getElement<HTMLInputElement>('depth');
            if (widthInput) widthInput.max = '305';
            if (heightInput) heightInput.max = '305';
            if (depthInput) depthInput.max = '61';
        }
        
        // Set the thickness dropdown to the correct value after options are updated
        const thicknessSelect = getElement<HTMLSelectElement>('material-thickness');
        if (selectedUnit === 'metric') {
            // Find the closest metric option to our converted thickness
            const metricThickness = this.currentConfig.materialThickness;
            if (thicknessSelect) {
                if (metricThickness <= 1.5) thicknessSelect.value = '1.27';
                else if (metricThickness <= 2.2) thicknessSelect.value = '1.91';
                else if (metricThickness <= 3.2) thicknessSelect.value = '2.54';
                else thicknessSelect.value = '3.81';
                
                // Update the config to match the selected value
                this.currentConfig.materialThickness = parseFloat(thicknessSelect.value);
            }
        } else {
            // For imperial, the default 0.75 should already be selected
            if (thicknessSelect) thicknessSelect.value = '0.75';
        }
        
        this.ui.resetInputs(this.currentConfig);
        
        this.updateShelf();
    }
    
    setupEventListeners() {
        const inputs = [
            'width', 'height', 'depth', 'material-thickness', 'material-type',
            'back-panel', 'edge-treatment', 'wood-grain'
        ];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = (element as any).type === 'checkbox' ? 'change' : 'input';
                element.addEventListener(eventType, () => this.handleInputChange(id));
            }
        });
        
        // Add unit toggle listeners
        const unitRadios = document.querySelectorAll('input[name="units"]');
        unitRadios.forEach(radio => {
            radio.addEventListener('change', () => this.handleUnitChange((radio as any).value));
        });
        
        // Add shelf layout listeners
        document.getElementById('add-divider')?.addEventListener('click', () => this.addHorizontalDivider());
        
        document.getElementById('generate-cutlist')?.addEventListener('click', () => this.generateCutList());
        document.getElementById('export-pdf')?.addEventListener('click', () => this.exportPDF());
        document.getElementById('reset')?.addEventListener('click', () => this.reset());
        
        document.getElementById('view-front')?.addEventListener('click', () => (this.shelfGenerator as any).setView('front'));
        document.getElementById('view-side')?.addEventListener('click', () => (this.shelfGenerator as any).setView('side'));
        document.getElementById('view-top')?.addEventListener('click', () => (this.shelfGenerator as any).setView('top'));
        document.getElementById('view-iso')?.addEventListener('click', () => (this.shelfGenerator as any).setView('iso'));
        document.getElementById('debug-toggle')?.addEventListener('click', () => this.toggleDebugMode());
    }
    
    handleInputChange(id: string): void {
        const element = document.getElementById(id);
        const key = this.getConfigKey(id);
        
        if (!element) return;
        
        if (asInput(element)?.type === 'checkbox') {
            (this.currentConfig as any)[key] = asInput(element)?.checked;
        } else if (asInput(element)?.type === 'number') {
            let value = parseFloat(asInput(element)?.value || '0');
            
            // Store the value in the current unit system without conversion
            (this.currentConfig as any)[key] = value;
        } else {
            (this.currentConfig as any)[key] = asInput(element)?.value || asSelect(element)?.value;
        }
        
        this.updateShelf();
    }
    
    getConfigKey(id: string): keyof ShelfConfig {
        const keyMap: Record<string, keyof ShelfConfig> = {
            'width': 'width',
            'height': 'height',
            'depth': 'depth',
            'material-thickness': 'materialThickness',
            'material-type': 'materialType',
            'back-panel': 'backPanel',
            'edge-treatment': 'edgeTreatment',
            'wood-grain': 'woodGrain'
        };
        return keyMap[id] as keyof ShelfConfig;
    }
    
    inchesToCm(inches: number): number {
        return inches * 2.54;
    }
    
    cmToInches(cm: number): number {
        return cm / 2.54;
    }
    
    handleUnitChange(newUnit: 'imperial' | 'metric'): void {
        const oldUnit = this.currentConfig.units;
        if (oldUnit === newUnit) return;
        
        // Convert all dimension values in UI and config
        const dimensionFields = ['width', 'height', 'depth'];
        const thicknessField = 'material-thickness';
        
        dimensionFields.forEach(field => {
            const element = asInput(document.getElementById(field));
            const configKey = this.getConfigKey(field);
            const currentValue = (this.currentConfig as any)[configKey];
            
            if (!element) return;
            
            if (newUnit === 'metric' && oldUnit === 'imperial') {
                // Convert inches to cm
                const newValue = this.inchesToCm(currentValue);
                element.value = (Math.round(newValue * 10) / 10).toString(); // Round to 1 decimal
                (this.currentConfig as any)[configKey] = Math.round(newValue * 10) / 10;
                element.step = '0.1';
                
                // Set appropriate metric limits
                if (field === 'width' || field === 'height') {
                    element.min = '15'; // ~6 inches
                    element.max = '305'; // ~120 inches
                } else if (field === 'depth') {
                    element.min = '10'; // ~4 inches
                    element.max = '61'; // ~24 inches
                }
            } else if (newUnit === 'imperial' && oldUnit === 'metric') {
                // Convert cm to inches
                const newValue = this.cmToInches(currentValue);
                element.value = (Math.round(newValue * 100) / 100).toString(); // Round to 2 decimals
                (this.currentConfig as any)[configKey] = Math.round(newValue * 100) / 100;
                element.step = '0.25';
                
                // Set appropriate imperial limits
                if (field === 'width' || field === 'height') {
                    element.min = '6';
                    element.max = '120';
                } else if (field === 'depth') {
                    element.min = '4';
                    element.max = '24';
                }
            }
        });
        
        // Handle thickness conversion
        const thicknessElement = document.getElementById(thicknessField);
        const thicknessKey = this.getConfigKey(thicknessField);
        const currentThickness = (this.currentConfig as any)[thicknessKey];
        
        if (newUnit === 'metric' && oldUnit === 'imperial') {
            const newThickness = this.inchesToCm(currentThickness as number);
            (this.currentConfig as any)[thicknessKey] = newThickness;
        } else if (newUnit === 'imperial' && oldUnit === 'metric') {
            const newThickness = this.cmToInches(currentThickness as number);
            (this.currentConfig as any)[thicknessKey] = newThickness;
        }
        
        // Handle divider position conversion
        this.currentConfig.shelfLayout.forEach(divider => {
            if (newUnit === 'metric' && oldUnit === 'imperial') {
                divider.position = Math.round(this.inchesToCm(divider.position) * 10) / 10;
            } else if (newUnit === 'imperial' && oldUnit === 'metric') {
                divider.position = Math.round(this.cmToInches(divider.position) * 100) / 100;
            }
        });
        
        // Update units AFTER conversion
        this.currentConfig.units = newUnit;
        
        // Update labels and thickness options
        this.updateLabels(newUnit);
        this.updateThicknessOptions(newUnit);
        
        // Re-render shelf layout controls to update unit labels and limits
        this.renderShelfLayoutControls();
        
        // Update the 3D model
        this.updateShelf();
    }
    
    updateLabels(unit) {
        const unitText = unit === 'metric' ? 'cm' : 'inches';
        
        document.getElementById('width-label').textContent = `Width (${unitText}):`;
        document.getElementById('height-label').textContent = `Height (${unitText}):`;
        document.getElementById('depth-label').textContent = `Depth (${unitText}):`;
        document.getElementById('thickness-label').textContent = `Thickness (${unitText}):`;
    }
    
    updateThicknessOptions(unit) {
        const select = document.getElementById('material-thickness');
        const currentValue = parseFloat(select.value);
        
        if (unit === 'metric') {
            select.innerHTML = `
                <option value="1.27">1.3 cm</option>
                <option value="1.91">1.9 cm</option>
                <option value="2.54">2.5 cm</option>
                <option value="3.81">3.8 cm</option>
            `;
            // Set closest metric equivalent
            if (currentValue <= 0.6) select.value = '1.27';
            else if (currentValue <= 0.85) select.value = '1.91';
            else if (currentValue <= 1.25) select.value = '2.54';
            else select.value = '3.81';
        } else {
            select.innerHTML = `
                <option value="0.5">1/2"</option>
                <option value="0.75">3/4"</option>
                <option value="1">1"</option>
                <option value="1.5">1-1/2"</option>
            `;
            // Set closest imperial equivalent
            if (currentValue <= 1.5) select.value = '0.5';
            else if (currentValue <= 2.2) select.value = '0.75';
            else if (currentValue <= 3.2) select.value = '1';
            else select.value = '1.5';
        }
    }
    
    // Coordinate conversion helpers
    toInches(value) {
        return this.currentConfig.units === 'metric' ? this.cmToInches(value) : value;
    }
    
    fromInches(value) {
        return this.currentConfig.units === 'metric' ? this.inchesToCm(value) : value;
    }
    
    getThreeJSConfig() {
        // Convert current config to inches for Three.js rendering
        const config = { ...this.currentConfig };
        if (this.currentConfig.units === 'metric') {
            config.width = this.cmToInches(config.width);
            config.height = this.cmToInches(config.height);
            config.depth = this.cmToInches(config.depth);
            config.materialThickness = this.cmToInches(config.materialThickness);
            config.shelfLayout = config.shelfLayout.map(d => ({
                ...d,
                position: this.cmToInches(d.position)
            }));
        }
        return config;
    }
    
    updateShelf(): void {
        (this.shelfGenerator as any).updateShelf(this.getThreeJSConfig());
    }
    
    generateCutList(): void {
        const cutList = (this.cutListGenerator as any).generate(this.currentConfig);
        (this.ui as any).displayCutList(cutList, this.currentConfig);
    }
    
    exportPDF(): void {
        const cutList = (this.cutListGenerator as any).generate(this.currentConfig);
        (this.ui as any).exportToPDF(cutList, this.currentConfig);
    }
    
    reset(): void {
        this.currentConfig = {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            materialType: 'plywood',
            shelfLayout: [], // Array of horizontal dividers
            verticalDividers: [], // Array of vertical dividers
            backPanel: false,
            edgeTreatment: 'none',
            woodGrain: true,
            units: 'imperial'
        };
        
        // Reset unit toggle
        const imperialRadio = document.querySelector('input[name="units"][value="imperial"]') as HTMLInputElement;
        if (imperialRadio) imperialRadio.checked = true;
        this.updateLabels('imperial');
        this.updateThicknessOptions('imperial');
        
        (this.ui as any).resetInputs(this.currentConfig);
        this.renderShelfLayoutControls();
        this.updateShelf();
        const cutlistPanel = document.getElementById('cutlist-panel');
        if (cutlistPanel) cutlistPanel.style.display = 'none';
    }
    
    // Divider Management API
    getInteriorHeight(): number {
        return this.currentConfig.height - (2 * this.currentConfig.materialThickness);
    }
    
    addDividerAtPosition(position: number | null = null): string {
        const defaultPosition = position ?? this.getInteriorHeight() / 2;
        
        // Debug: uncomment to see position values
        // console.log(`addDividerAtPosition: ${position} (${this.currentConfig.units});`
        
        const newDivider = {
            id: Date.now().toString(),
            position: defaultPosition
        };
        
        this.currentConfig.shelfLayout.push(newDivider);
        this.renderShelfLayoutControls();
        this.updateShelf();
        return newDivider.id;
    }
    
    removeDivider(dividerId: string): void {
        this.currentConfig.shelfLayout = this.currentConfig.shelfLayout.filter(d => d.id !== dividerId);
        this.renderShelfLayoutControls();
        this.updateShelf();
    }
    
    updateDivider(dividerId: string, property: string, value: any): void {
        const divider = this.currentConfig.shelfLayout.find(d => d.id === dividerId);
        if (!divider) return;
        
        if (property === 'position') {
            divider.position = parseFloat(value);
        }
        // Note: spaces system has been replaced by individual vertical dividers
        this.updateShelf();
    }
    
    // Add vertical divider at specific position (like horizontal dividers)
    addVerticalDividerAtPosition(position: number | null = null): string {
        const interiorWidth = this.currentConfig.width - (2 * this.currentConfig.materialThickness);
        const defaultPosition = position ?? 0; // Default to center
        
        const newVerticalDivider = {
            id: Date.now().toString(),
            position: defaultPosition
        };
        
        console.log('🔧 Adding vertical divider:', newVerticalDivider);
        console.log('🔧 Current vertical dividers before:', this.currentConfig.verticalDividers.length);
        
        this.currentConfig.verticalDividers.push(newVerticalDivider);
        
        console.log('🔧 Current vertical dividers after:', this.currentConfig.verticalDividers.length);
        console.log('🔧 All vertical dividers:', this.currentConfig.verticalDividers);
        
        this.renderShelfLayoutControls();
        this.updateShelf();
        return newVerticalDivider.id;
    }

    // Remove vertical divider (like horizontal dividers)
    removeVerticalDivider(dividerId: string): void {
        this.currentConfig.verticalDividers = this.currentConfig.verticalDividers.filter(d => d.id !== dividerId);
        this.renderShelfLayoutControls();
        this.updateShelf();
    }

    // Update vertical divider position (like horizontal dividers)
    updateVerticalDivider(dividerId: string, property: string, value: any): void {
        const divider = this.currentConfig.verticalDividers.find(d => d.id === dividerId);
        if (!divider) return;
        
        if (property === 'position') {
            divider.position = parseFloat(value);
        }
        this.updateShelf();
    }

    // Legacy method for UI compatibility
    addHorizontalDivider(): void {
        this.addDividerAtPosition();
    }
    
    toggleDebugMode() {
        const button = document.getElementById('debug-toggle');
        if (this.shelfGenerator.debugMode) {
            this.shelfGenerator.disableDebugMode();
            button.textContent = 'Debug Mode';
            button.style.backgroundColor = '';
        } else {
            this.shelfGenerator.enableDebugMode();
            button.textContent = 'Debug ON';
            button.style.backgroundColor = '#ff4757';
        }
    }
    
    
    getCompartmentColorCSS(dividerId) {
        // High-contrast color palette that matches the 3D renderer
        const colors = [
            '#ff4757', // Bright Red
            '#3742fa', // Royal Blue  
            '#2ed573', // Bright Green
            '#ffa502', // Orange
            '#a4b0be', // Light Gray
            '#8e44ad', // Purple
            '#f39c12', // Golden Yellow
            '#e74c3c', // Crimson
            '#1e90ff', // Dodger Blue
            '#27ae60'  // Forest Green
        ];
        
        // Use the same hash function as the 3D renderer
        const hash = dividerId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    renderShelfLayoutControls() {
        const container = document.getElementById('dividers-list');
        container.innerHTML = '';
        
        // Sort dividers by position
        const sortedDividers = [...this.currentConfig.shelfLayout].sort((a, b) => a.position - b.position);
        const unitText = this.currentConfig.units === 'metric' ? 'cm' : 'inches';
        const interiorHeight = this.currentConfig.height - (2 * this.currentConfig.materialThickness);
        
        sortedDividers.forEach((divider, index) => {
            const dividerEl = document.createElement('div');
            dividerEl.className = 'divider-control';
            
            // Create header
            const header = document.createElement('div');
            header.className = 'divider-control-header';
            
            const title = document.createElement('h5');
            title.textContent = `Horizontal Divider ${index + 1}`;
            
            header.appendChild(title);
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-divider-btn';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove divider';
            removeBtn.addEventListener('click', () => this.removeDivider(divider.id));
            
            // Position control
            const positionGroup = document.createElement('div');
            positionGroup.className = 'input-group';
            
            const positionLabel = document.createElement('label');
            positionLabel.textContent = `Position from bottom (${unitText}):`;
            
            const positionInput = document.createElement('input');
            positionInput.type = 'number';
            positionInput.min = '2';
            positionInput.max = interiorHeight - 2;
            positionInput.step = this.currentConfig.units === 'metric' ? '0.5' : '0.25';
            positionInput.value = divider.position;
            
            positionInput.addEventListener('input', (e) => {
                this.updateDivider(divider.id, 'position', parseFloat(e.target.value));
            });
            
            positionGroup.appendChild(positionLabel);
            positionGroup.appendChild(positionInput);
            
            dividerEl.appendChild(removeBtn);
            dividerEl.appendChild(header);
            dividerEl.appendChild(positionGroup);
            
            // Note: Old space controls removed - vertical dividers now work independently
            
            container.appendChild(dividerEl);
        });
    }
    
    // Note: createSpaceControls method removed - vertical dividers now work independently

    // Note: shouldShowSpaceControls method removed - vertical dividers now work independently
}

// Make app instance globally available for onclick handlers
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app; // Make globally accessible for 3D interactions
    
    // Test our XState setup
    console.log('🚀 Starting XState Migration - Phase 5, Week 1');
    testStateMachine();
});