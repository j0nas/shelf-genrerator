import { ShelfConfig } from './types.js';

export class UI {
    
    constructor() {
    }
    
    
    
    formatDimension(cm) {
        return cm.toFixed(1);
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    
    resetInputs(config) {
        Object.entries(config).forEach(([key, value]) => {
            const elementId = this.getElementId(key);
            const element = document.getElementById(elementId);
            
            if (element) {
                const input = element as HTMLInputElement;
                if (input.type === 'checkbox') {
                    input.checked = value as boolean;
                } else {
                    input.value = value as string;
                }
            }
        });
    }
    
    getElementId(configKey) {
        const idMap = {
            'width': 'width',
            'height': 'height', 
            'depth': 'depth',
            'materialThickness': 'material-thickness',
            'materialType': 'material-type',
            'shelfCount': 'shelf-count',
            'shelfSpacing': 'shelf-spacing',
            'backPanel': 'back-panel',
            'adjustableShelves': 'adjustable-shelves',
            'jointType': 'joint-type',
            'edgeTreatment': 'edge-treatment',
            'woodGrain': 'wood-grain'
        };
        return idMap[configKey];
    }
}