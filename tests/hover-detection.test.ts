import { describe, it, expect } from 'vitest';
import { MaterialManager } from '../js/material-manager.js';
import * as THREE from 'three';

describe('Hover Detection Fix', () => {
    describe('Divider Material Configuration', () => {
        it('should create double-sided edge materials for proper hover detection', () => {
            const materials = MaterialManager.createMaterials('plywood');
            
            // Edge materials are used for dividers and should be double-sided
            // This ensures hover detection works on all faces, not just front-facing
            expect(materials.edge.side).toBe(THREE.DoubleSide);
        });

        it('should ensure all material types use double-sided edges', () => {
            const materialTypes = ['plywood', 'mdf', 'pine', 'oak', 'maple'];
            
            materialTypes.forEach(materialType => {
                const materials = MaterialManager.createMaterials(materialType);
                expect(materials.edge.side).toBe(THREE.DoubleSide);
            });
        });

        it('should preserve double-sided property when materials are cloned', () => {
            const materials = MaterialManager.createMaterials('oak');
            const clonedMaterial = materials.edge.clone();
            
            // The cloned material should preserve the side property
            expect(clonedMaterial.side).toBe(THREE.DoubleSide);
        });
    });

    describe('Material Usage Documentation', () => {
        it('should document that edge materials are used for dividers', () => {
            // This test documents that:
            // 1. Dividers use materials.edge.clone() in createDividerMesh()
            // 2. Edge materials are now double-sided for consistent hover detection
            // 3. Both hover and click use the same raycasting logic in getDividerAtPosition()
            
            const materials = MaterialManager.createMaterials('plywood');
            
            // Verify the edge material is configured for divider interaction
            expect(materials.edge).toBeInstanceOf(THREE.MeshLambertMaterial);
            expect(materials.edge.side).toBe(THREE.DoubleSide);
            expect(materials.edge.transparent).toBe(true);
        });
    });
});