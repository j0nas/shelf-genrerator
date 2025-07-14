import { ShelfGenerator } from './shelf-generator.js';
import { CutListGenerator } from './cutlist-generator.js';
import { UI } from './ui.js';

class App {
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
            shelfSpacing: 12,
            shelfLayout: [], // Array of horizontal dividers
            backPanel: false,
            adjustableShelves: false,
            edgeTreatment: 'none',
            woodGrain: true,
            units: 'imperial'
        };
        
        this.init();
    }
    
    
    init() {
        this.setupEventListeners();
        this.shelfGenerator.init('three-canvas');
        
        // Check the actual state of the units radio button
        const selectedUnit = document.querySelector('input[name="units"]:checked')?.value || 'imperial';
        
        // If the selected unit doesn't match our config, update the config
        if (selectedUnit !== this.currentConfig.units) {
            // Update the config to match the UI without triggering conversions
            this.currentConfig.units = selectedUnit;
            
            // If metric is selected, convert the default imperial values to metric
            if (selectedUnit === 'metric') {
                this.currentConfig.width = Math.round(this.inchesToCm(this.currentConfig.width) * 10) / 10;
                this.currentConfig.height = Math.round(this.inchesToCm(this.currentConfig.height) * 10) / 10;
                this.currentConfig.depth = Math.round(this.inchesToCm(this.currentConfig.depth) * 10) / 10;
                this.currentConfig.materialThickness = this.inchesToCm(this.currentConfig.materialThickness);
                this.currentConfig.shelfSpacing = Math.round(this.inchesToCm(this.currentConfig.shelfSpacing) * 10) / 10;
                
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
            document.getElementById('width').max = '305';
            document.getElementById('height').max = '305';
            document.getElementById('depth').max = '61';
            document.getElementById('shelf-spacing').max = '61';
        }
        
        // Set the thickness dropdown to the correct value after options are updated
        const thicknessSelect = document.getElementById('material-thickness');
        if (selectedUnit === 'metric') {
            // Find the closest metric option to our converted thickness
            const metricThickness = this.currentConfig.materialThickness;
            if (metricThickness <= 1.5) thicknessSelect.value = '1.27';
            else if (metricThickness <= 2.2) thicknessSelect.value = '1.91';
            else if (metricThickness <= 3.2) thicknessSelect.value = '2.54';
            else thicknessSelect.value = '3.81';
            
            // Update the config to match the selected value
            this.currentConfig.materialThickness = parseFloat(thicknessSelect.value);
        } else {
            // For imperial, the default 0.75 should already be selected
            thicknessSelect.value = '0.75';
        }
        
        this.ui.resetInputs(this.currentConfig);
        
        this.updateShelf();
    }
    
    setupEventListeners() {
        const inputs = [
            'width', 'height', 'depth', 'material-thickness', 'material-type',
            'shelf-spacing', 'back-panel', 'adjustable-shelves',
            'edge-treatment', 'wood-grain'
        ];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'input';
                element.addEventListener(eventType, () => this.handleInputChange(id));
            }
        });
        
        // Add unit toggle listeners
        const unitRadios = document.querySelectorAll('input[name="units"]');
        unitRadios.forEach(radio => {
            radio.addEventListener('change', () => this.handleUnitChange(radio.value));
        });
        
        // Add shelf layout listeners
        document.getElementById('add-divider').addEventListener('click', () => this.addHorizontalDivider());
        
        document.getElementById('generate-cutlist').addEventListener('click', () => this.generateCutList());
        document.getElementById('export-pdf').addEventListener('click', () => this.exportPDF());
        document.getElementById('reset').addEventListener('click', () => this.reset());
        
        document.getElementById('view-front').addEventListener('click', () => this.shelfGenerator.setView('front'));
        document.getElementById('view-side').addEventListener('click', () => this.shelfGenerator.setView('side'));
        document.getElementById('view-top').addEventListener('click', () => this.shelfGenerator.setView('top'));
        document.getElementById('view-iso').addEventListener('click', () => this.shelfGenerator.setView('iso'));
    }
    
    handleInputChange(id) {
        const element = document.getElementById(id);
        const key = this.getConfigKey(id);
        
        if (element.type === 'checkbox') {
            this.currentConfig[key] = element.checked;
        } else if (element.type === 'number') {
            let value = parseFloat(element.value);
            
            // Store the value in the current unit system without conversion
            this.currentConfig[key] = value;
        } else {
            this.currentConfig[key] = element.value;
        }
        
        this.updateShelf();
    }
    
    getConfigKey(id) {
        const keyMap = {
            'width': 'width',
            'height': 'height',
            'depth': 'depth',
            'material-thickness': 'materialThickness',
            'material-type': 'materialType',
            'shelf-spacing': 'shelfSpacing',
            'back-panel': 'backPanel',
            'adjustable-shelves': 'adjustableShelves',
            'edge-treatment': 'edgeTreatment',
            'wood-grain': 'woodGrain'
        };
        return keyMap[id];
    }
    
    inchesToCm(inches) {
        return inches * 2.54;
    }
    
    cmToInches(cm) {
        return cm / 2.54;
    }
    
    handleUnitChange(newUnit) {
        const oldUnit = this.currentConfig.units;
        if (oldUnit === newUnit) return;
        
        // Convert all dimension values in UI and config
        const dimensionFields = ['width', 'height', 'depth', 'shelf-spacing'];
        const thicknessField = 'material-thickness';
        
        dimensionFields.forEach(field => {
            const element = document.getElementById(field);
            const configKey = this.getConfigKey(field);
            const currentValue = this.currentConfig[configKey];
            
            if (newUnit === 'metric' && oldUnit === 'imperial') {
                // Convert inches to cm
                const newValue = this.inchesToCm(currentValue);
                element.value = Math.round(newValue * 10) / 10; // Round to 1 decimal
                this.currentConfig[configKey] = Math.round(newValue * 10) / 10;
                element.step = '0.1';
                
                // Set appropriate metric limits
                if (field === 'width' || field === 'height') {
                    element.min = '15'; // ~6 inches
                    element.max = '305'; // ~120 inches
                } else if (field === 'depth') {
                    element.min = '10'; // ~4 inches
                    element.max = '61'; // ~24 inches
                } else if (field === 'shelf-spacing') {
                    element.min = '15'; // ~6 inches
                    element.max = '61'; // ~24 inches
                }
            } else if (newUnit === 'imperial' && oldUnit === 'metric') {
                // Convert cm to inches
                const newValue = this.cmToInches(currentValue);
                element.value = Math.round(newValue * 100) / 100; // Round to 2 decimals
                this.currentConfig[configKey] = Math.round(newValue * 100) / 100;
                element.step = '0.25';
                
                // Set appropriate imperial limits
                if (field === 'width' || field === 'height') {
                    element.min = '6';
                    element.max = '120';
                } else if (field === 'depth') {
                    element.min = '4';
                    element.max = '24';
                } else if (field === 'shelf-spacing') {
                    element.min = '6';
                    element.max = '24';
                }
            }
        });
        
        // Handle thickness conversion
        const thicknessElement = document.getElementById(thicknessField);
        const thicknessKey = this.getConfigKey(thicknessField);
        const currentThickness = this.currentConfig[thicknessKey];
        
        if (newUnit === 'metric' && oldUnit === 'imperial') {
            const newThickness = this.inchesToCm(currentThickness);
            this.currentConfig[thicknessKey] = newThickness;
        } else if (newUnit === 'imperial' && oldUnit === 'metric') {
            const newThickness = this.cmToInches(currentThickness);
            this.currentConfig[thicknessKey] = newThickness;
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
        document.getElementById('shelf-spacing-label').textContent = `Shelf Spacing (${unitText}):`;
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
    
    updateShelf() {
        // Convert config to consistent units for Three.js (always work in inches internally)
        const threeConfig = { ...this.currentConfig };
        
        if (this.currentConfig.units === 'metric') {
            // Convert cm back to inches for Three.js rendering
            threeConfig.width = this.cmToInches(this.currentConfig.width);
            threeConfig.height = this.cmToInches(this.currentConfig.height);
            threeConfig.depth = this.cmToInches(this.currentConfig.depth);
            threeConfig.materialThickness = this.cmToInches(this.currentConfig.materialThickness);
            threeConfig.shelfSpacing = this.cmToInches(this.currentConfig.shelfSpacing);
            
            // Convert divider positions to inches
            threeConfig.shelfLayout = this.currentConfig.shelfLayout.map(divider => ({
                ...divider,
                position: this.cmToInches(divider.position)
            }));
        }
        
        this.shelfGenerator.updateShelf(threeConfig);
    }
    
    generateCutList() {
        const cutList = this.cutListGenerator.generate(this.currentConfig);
        this.ui.displayCutList(cutList, this.currentConfig);
    }
    
    exportPDF() {
        const cutList = this.cutListGenerator.generate(this.currentConfig);
        this.ui.exportToPDF(cutList, this.currentConfig);
    }
    
    reset() {
        this.currentConfig = {
            width: 36,
            height: 72,
            depth: 12,
            materialThickness: 0.75,
            materialType: 'plywood',
            shelfSpacing: 12,
            shelfLayout: [], // Array of horizontal dividers
            backPanel: false,
            adjustableShelves: false,
            edgeTreatment: 'none',
            woodGrain: true,
            units: 'imperial'
        };
        
        // Reset unit toggle
        document.querySelector('input[name="units"][value="imperial"]').checked = true;
        this.updateLabels('imperial');
        this.updateThicknessOptions('imperial');
        
        this.ui.resetInputs(this.currentConfig);
        this.renderShelfLayoutControls();
        this.updateShelf();
        document.getElementById('cutlist-panel').style.display = 'none';
    }
    
    addHorizontalDivider() {
        // Calculate default position (middle of available space) in current units
        let interiorHeight, defaultPosition;
        
        if (this.currentConfig.units === 'metric') {
            // Already in cm
            interiorHeight = this.currentConfig.height - (2 * this.currentConfig.materialThickness);
            defaultPosition = interiorHeight / 2;
        } else {
            // Already in inches
            interiorHeight = this.currentConfig.height - (2 * this.currentConfig.materialThickness);
            defaultPosition = interiorHeight / 2;
        }
        
        const newDivider = {
            id: Date.now().toString(),
            position: defaultPosition, // Position from bottom of interior space in current units
            spaces: {
                above: { verticalDividers: 0 },
                below: { verticalDividers: 0 }
            }
        };
        
        this.currentConfig.shelfLayout.push(newDivider);
        this.renderShelfLayoutControls();
        this.updateShelf();
    }
    
    removeDivider(dividerId) {
        this.currentConfig.shelfLayout = this.currentConfig.shelfLayout.filter(
            divider => divider.id !== dividerId
        );
        this.renderShelfLayoutControls();
        this.updateShelf();
    }
    
    updateDivider(dividerId, property, value) {
        const divider = this.currentConfig.shelfLayout.find(d => d.id === dividerId);
        if (divider) {
            if (property === 'position') {
                divider.position = parseFloat(value);
            } else if (property.startsWith('spaces.')) {
                // Handle nested space properties like 'spaces.above.verticalDividers'
                const [, spaceType, spaceProperty] = property.split('.');
                divider.spaces[spaceType][spaceProperty] = parseInt(value);
            }
            // Don't re-render controls when just updating values, only update the 3D model
            this.updateShelf();
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
            
            // Add space controls after position group
            if (this.shouldShowSpaceControls(index, 'above')) {
                const aboveGroup = this.createSpaceControls(divider, 'above', 'Space Above Divider');
                dividerEl.appendChild(aboveGroup);
            }
            
            if (this.shouldShowSpaceControls(index, 'below')) {
                const belowGroup = this.createSpaceControls(divider, 'below', 'Space Below Divider');
                dividerEl.appendChild(belowGroup);
            }
            
            container.appendChild(dividerEl);
        });
    }
    
    createSpaceControls(divider, spaceType, labelText) {
        const spaceGroup = document.createElement('div');
        spaceGroup.className = 'space-control-group';
        
        const spaceHeader = document.createElement('h6');
        spaceHeader.textContent = labelText;
        spaceHeader.className = 'space-header';
        
        // Add color indicator for this space
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'compartment-color-indicator';
        colorIndicator.style.backgroundColor = this.getCompartmentColorCSS(`${divider.id}-${spaceType}`);
        
        const headerRow = document.createElement('div');
        headerRow.className = 'space-header-row';
        headerRow.appendChild(colorIndicator);
        headerRow.appendChild(spaceHeader);
        
        const controlsRow = document.createElement('div');
        controlsRow.className = 'space-controls-row';
        
        // Vertical dividers control for this space
        const verticalGroup = document.createElement('div');
        verticalGroup.className = 'input-group';
        
        const verticalLabel = document.createElement('label');
        verticalLabel.textContent = 'Vertical Dividers:';
        
        const verticalSelect = document.createElement('select');
        for (let i = 0; i <= 4; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (divider.spaces[spaceType].verticalDividers === i) {
                option.selected = true;
            }
            verticalSelect.appendChild(option);
        }
        
        verticalSelect.value = divider.spaces[spaceType].verticalDividers;
        
        verticalSelect.addEventListener('change', (e) => {
            this.updateDivider(divider.id, `spaces.${spaceType}.verticalDividers`, parseInt(e.target.value));
        });
        
        verticalGroup.appendChild(verticalLabel);
        verticalGroup.appendChild(verticalSelect);
        controlsRow.appendChild(verticalGroup);
        
        spaceGroup.appendChild(headerRow);
        spaceGroup.appendChild(controlsRow);
        
        return spaceGroup;
    }

    shouldShowSpaceControls(dividerIndex, spaceType) {
        // Only the first (lowest) divider controls both above and below
        // All other dividers only control the space above them
        if (dividerIndex === 0) {
            return true; // First divider controls both above and below
        } else {
            return spaceType === 'above'; // Other dividers only control above
        }
    }
}

// Make app instance globally available for onclick handlers
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});