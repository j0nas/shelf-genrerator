// @ts-nocheck
import { ShelfConfig, CutListData, CutListPiece, MaterialSummary } from './types.js';

export class CutListGenerator {
    materialPrices: Record<string, number>;
    
    constructor() {
        this.materialPrices = {
            plywood: 45.00,
            mdf: 25.00,
            pine: 35.00,
            oak: 85.00,
            maple: 75.00
        };
    }
    
    generate(config: ShelfConfig): CutListData {
        const cuts = [];
        const thickness = config.materialThickness;
        
        cuts.push(...this.generateSideCuts(config));
        cuts.push(...this.generateShelfCuts(config));
        
        if (config.backPanel) {
            cuts.push(...this.generateBackPanelCuts(config));
        }
        
        if (config.shelfLayout && config.shelfLayout.length > 0) {
            cuts.push(...this.generateDividerCuts(config));
        }
        
        const optimizedCuts = this.optimizeCuts(cuts);
        const materialUsage = this.calculateMaterialUsage(optimizedCuts);
        const cost = this.calculateCost(materialUsage, config.materialType);
        
        return {
            cuts: optimizedCuts,
            materialUsage,
            cost,
            summary: this.generateSummary(optimizedCuts, materialUsage, cost)
        };
    }
    
    generateSideCuts(config) {
        const thickness = config.materialThickness;
        
        return [
            {
                part: 'Left Side',
                quantity: 1,
                width: config.depth,
                height: config.height,
                thickness: thickness,
                material: config.materialType,
                notes: `Dado grooves ${this.fractionToDecimal(thickness / 3)}\" deep`
            },
            {
                part: 'Right Side',
                quantity: 1,
                width: config.depth,
                height: config.height,
                thickness: thickness,
                material: config.materialType,
                notes: `Dado grooves ${this.fractionToDecimal(thickness / 3)}\" deep`
            }
        ];
    }
    
    generateShelfCuts(config) {
        const thickness = config.materialThickness;
        // Dado joints: shelves extend into grooves
        const shelfWidth = config.width - thickness;
        
        const shelves = [];
        
        shelves.push({
            part: 'Top Shelf',
            quantity: 1,
            width: shelfWidth,
            height: config.depth,
            thickness: thickness,
            material: config.materialType,
            notes: 'Fits into dado grooves'
        });
        
        shelves.push({
            part: 'Bottom Shelf',
            quantity: 1,
            width: shelfWidth,
            height: config.depth,
            thickness: thickness,
            material: config.materialType,
            notes: 'Fits into dado grooves'
        });
        
        return shelves;
    }
    
    generateBackPanelCuts(config) {
        const backThickness = Math.max(0.25, config.materialThickness / 3);
        
        return [{
            part: 'Back Panel',
            quantity: 1,
            width: config.width - (2 * config.materialThickness),
            height: config.height,
            thickness: backThickness,
            material: config.materialType,
            notes: 'Fits in rabbet or attached to back'
        }];
    }
    
    generateDividerCuts(config) {
        const cuts = [];
        const thickness = config.materialThickness;
        const shelfWidth = config.width - (2 * thickness);
        const interiorHeight = config.height - (2 * thickness);
        
        // Count total horizontal dividers
        const totalHorizontalDividers = config.shelfLayout.length;
        
        if (totalHorizontalDividers > 0) {
            cuts.push({
                part: 'Horizontal Dividers',
                quantity: totalHorizontalDividers,
                width: shelfWidth,
                height: config.depth,
                thickness: thickness,
                material: config.materialType,
                notes: 'Custom positioned horizontal shelf dividers'
            });
        }
        
        // Add vertical dividers using the new simple array system
        if (config.verticalDividers && config.verticalDividers.length > 0) {
            // All vertical dividers are full height in the new system
            cuts.push({
                part: `Vertical Dividers`,
                quantity: config.verticalDividers.length,
                width: config.depth,
                height: interiorHeight,
                thickness: thickness,
                material: config.materialType,
                notes: `Full-height vertical dividers`
            });
        }
        
        return cuts;
    }
    
    
    optimizeCuts(cuts) {
        return cuts.map(cut => ({
            ...cut,
            boardFeet: this.calculateBoardFeet(cut),
            cutOptimization: this.suggestCutOptimization(cut)
        }));
    }
    
    calculateBoardFeet(cut) {
        const widthFt = cut.width / 12;
        const heightFt = cut.height / 12;
        const thicknessFt = cut.thickness / 12;
        
        return (widthFt * heightFt * thicknessFt * cut.quantity).toFixed(3);
    }
    
    suggestCutOptimization(cut) {
        const standardSheetSizes = [
            { width: 48, height: 96 },
            { width: 48, height: 48 },
            { width: 24, height: 48 }
        ];
        
        for (const sheet of standardSheetSizes) {
            const fitsWidth = cut.width <= sheet.width;
            const fitsHeight = cut.height <= sheet.height;
            
            if (fitsWidth && fitsHeight) {
                const piecesPerSheet = Math.floor(sheet.width / cut.width) * 
                                      Math.floor(sheet.height / cut.height);
                
                if (piecesPerSheet >= cut.quantity) {
                    return `Can cut ${cut.quantity} from ${sheet.width}x${sheet.height} sheet`;
                }
            }
        }
        
        return 'May require multiple sheets or custom sizing';
    }
    
    calculateMaterialUsage(cuts) {
        const usage = {};
        
        cuts.forEach(cut => {
            if (!usage[cut.material]) {
                usage[cut.material] = {
                    totalBoardFeet: 0,
                    sheetsNeeded: 0,
                    cuts: []
                };
            }
            
            usage[cut.material].totalBoardFeet += parseFloat(cut.boardFeet);
            usage[cut.material].cuts.push(cut);
        });
        
        Object.keys(usage).forEach(material => {
            usage[material].sheetsNeeded = Math.ceil(usage[material].totalBoardFeet / 32);
        });
        
        return usage;
    }
    
    calculateCost(materialUsage, primaryMaterial) {
        let totalCost = 0;
        
        Object.keys(materialUsage).forEach(material => {
            const pricePerSheet = this.materialPrices[material] || 45.00;
            const materialCost = materialUsage[material].sheetsNeeded * pricePerSheet;
            totalCost += materialCost;
            materialUsage[material].cost = materialCost;
        });
        
        const hardwareCost = this.estimateHardwareCost();
        
        return {
            materials: totalCost,
            hardware: hardwareCost,
            total: totalCost + hardwareCost
        };
    }
    
    estimateHardwareCost() {
        return 15.00;
    }
    
    generateSummary(cuts, materialUsage, cost) {
        const totalParts = cuts.reduce((sum, cut) => sum + cut.quantity, 0);
        const primaryMaterial = Object.keys(materialUsage)[0];
        
        return {
            totalParts,
            totalBoardFeet: Object.values(materialUsage)
                .reduce((sum, usage) => sum + usage.totalBoardFeet, 0)
                .toFixed(2),
            estimatedTime: this.estimateBuildTime(cuts),
            difficulty: this.assessDifficulty(cuts),
            primaryMaterial
        };
    }
    
    estimateBuildTime(cuts) {
        const baseCutTime = cuts.length * 15;
        const assemblyTime = 120;
        const finishingTime = 180;
        
        const totalMinutes = baseCutTime + assemblyTime + finishingTime;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${hours}h ${minutes}m`;
    }
    
    assessDifficulty(cuts) {
        const partCount = cuts.reduce((sum, cut) => sum + cut.quantity, 0);
        
        // Dado joints are intermediate complexity
        if (partCount > 8) {
            return 'Intermediate';
        } else if (partCount > 5) {
            return 'Beginner-Intermediate';
        } else {
            return 'Beginner-Intermediate'; // Dados make any project at least beginner-intermediate
        }
    }
    
    fractionToDecimal(fraction) {
        return fraction.toFixed(3);
    }
}