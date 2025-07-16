import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaterialManager } from '../js/material-manager.js';
import * as THREE from 'three';

describe('MaterialManager', () => {
    afterEach(() => {
        MaterialManager.clearCache();
    });

    describe('createMaterials', () => {
        it('should create materials for known material types', () => {
            const materials = MaterialManager.createMaterials('plywood');
            
            expect(materials).toHaveProperty('main');
            expect(materials).toHaveProperty('edge');
            expect(materials.main).toBeInstanceOf(THREE.MeshLambertMaterial);
            expect(materials.edge).toBeInstanceOf(THREE.MeshLambertMaterial);
            
            // Edge materials should be double-sided for proper hover detection
            expect(materials.edge.side).toBe(THREE.DoubleSide);
        });

        it('should fallback to plywood for unknown material types', () => {
            const plywoodMaterials = MaterialManager.createMaterials('plywood');
            const unknownMaterials = MaterialManager.createMaterials('unknown');
            
            expect(plywoodMaterials.main.color.getHex()).toBe(unknownMaterials.main.color.getHex());
            expect(plywoodMaterials.edge.color.getHex()).toBe(unknownMaterials.edge.color.getHex());
        });

        it('should cache materials and reuse them', () => {
            const materials1 = MaterialManager.createMaterials('oak');
            const materials2 = MaterialManager.createMaterials('oak');
            
            expect(materials1.main).toBe(materials2.main);
            expect(materials1.edge).toBe(materials2.edge);
        });

        it('should create different materials for different types', () => {
            const oakMaterials = MaterialManager.createMaterials('oak');
            const mapMaterials = MaterialManager.createMaterials('maple');
            
            expect(oakMaterials.main.color.getHex()).not.toBe(mapMaterials.main.color.getHex());
            expect(oakMaterials.edge.color.getHex()).not.toBe(mapMaterials.edge.color.getHex());
        });
    });

    describe('createHighlightMaterial', () => {
        it('should create highlight material with correct properties', () => {
            const material = MaterialManager.createHighlightMaterial(0xff0000, 0.5);
            
            expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
            expect(material.color.getHex()).toBe(0xff0000);
            expect(material.opacity).toBe(0.5);
            expect(material.transparent).toBe(true);
        });

        it('should cache highlight materials', () => {
            const material1 = MaterialManager.createHighlightMaterial(0xff0000, 0.5);
            const material2 = MaterialManager.createHighlightMaterial(0xff0000, 0.5);
            
            expect(material1).toBe(material2);
        });
    });

    describe('createGhostMaterial', () => {
        it('should create ghost material with correct properties', () => {
            const material = MaterialManager.createGhostMaterial(0x00ff00);
            
            expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
            expect(material.color.getHex()).toBe(0x00ff00);
            expect(material.opacity).toBe(0.5);
            expect(material.transparent).toBe(true);
            expect(material.depthTest).toBe(false);
        });

        it('should cache ghost materials', () => {
            const material1 = MaterialManager.createGhostMaterial(0x00ff00);
            const material2 = MaterialManager.createGhostMaterial(0x00ff00);
            
            expect(material1).toBe(material2);
        });
    });

    describe('disposeMesh', () => {
        it('should dispose geometry and material', () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial();
            const mesh = new THREE.Mesh(geometry, material);
            
            const geometryDispose = vitest.spyOn(geometry, 'dispose');
            const materialDispose = vitest.spyOn(material, 'dispose');
            
            MaterialManager.disposeMesh(mesh);
            
            expect(geometryDispose).toHaveBeenCalled();
            expect(materialDispose).toHaveBeenCalled();
        });

        it('should handle array of materials', () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material1 = new THREE.MeshBasicMaterial();
            const material2 = new THREE.MeshBasicMaterial();
            const mesh = new THREE.Mesh(geometry, [material1, material2]);
            
            const geometryDispose = vitest.spyOn(geometry, 'dispose');
            const material1Dispose = vitest.spyOn(material1, 'dispose');
            const material2Dispose = vitest.spyOn(material2, 'dispose');
            
            MaterialManager.disposeMesh(mesh);
            
            expect(geometryDispose).toHaveBeenCalled();
            expect(material1Dispose).toHaveBeenCalled();
            expect(material2Dispose).toHaveBeenCalled();
        });

        it('should handle meshes without geometry or material', () => {
            const emptyMesh = {};
            
            expect(() => {
                MaterialManager.disposeMesh(emptyMesh);
            }).not.toThrow();
        });
    });

    describe('clearCache', () => {
        it('should dispose all cached materials', () => {
            const material1 = MaterialManager.createMaterials('oak');
            const material2 = MaterialManager.createHighlightMaterial(0xff0000, 0.5);
            
            const mainDispose = vitest.spyOn(material1.main, 'dispose');
            const edgeDispose = vitest.spyOn(material1.edge, 'dispose');
            const highlightDispose = vitest.spyOn(material2, 'dispose');
            
            MaterialManager.clearCache();
            
            expect(mainDispose).toHaveBeenCalled();
            expect(edgeDispose).toHaveBeenCalled();
            expect(highlightDispose).toHaveBeenCalled();
        });

        it('should recreate materials after cache clear', () => {
            const material1 = MaterialManager.createMaterials('oak');
            MaterialManager.clearCache();
            const material2 = MaterialManager.createMaterials('oak');
            
            expect(material1.main).not.toBe(material2.main);
            expect(material1.edge).not.toBe(material2.edge);
        });
    });
});