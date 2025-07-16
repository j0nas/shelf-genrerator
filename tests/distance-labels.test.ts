import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DistanceLabelManager } from '../js/distance-labels.js';
import * as THREE from 'three';
import { JSDOM } from 'jsdom';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"></div></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

describe('DistanceLabelManager', () => {
    let manager: DistanceLabelManager;
    let container: HTMLElement;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    
    beforeEach(() => {
        // Clear any existing label containers
        const existingContainer = document.getElementById('distance-labels');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Create test DOM container
        container = document.getElementById('test-container')!;
        
        // Create Three.js objects
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        scene = new THREE.Scene();
        
        // Mock WebGLRenderer
        renderer = {
            domElement: {
                clientWidth: 800,
                clientHeight: 600
            }
        } as any;
        
        manager = new DistanceLabelManager(container, camera, renderer, scene);
    });

    describe('Horizontal Divider Distance Calculations', () => {
        it('should calculate distances to adjacent dividers correctly', () => {
            const hoveredDivider = { id: 'div2', position: 60, type: 'horizontal' as const };
            const allHorizontalDividers = [
                { id: 'div1', position: 30, type: 'horizontal' as const },
                { id: 'div2', position: 60, type: 'horizontal' as const },
                { id: 'div3', position: 90, type: 'horizontal' as const }
            ];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8
            };

            const distances = manager.calculateHorizontalDividerDistances(
                hoveredDivider,
                allHorizontalDividers,
                config
            );

            expect(distances).toHaveLength(2);
            
            // Distance above (to div3)
            const distanceAbove = distances.find(d => d.distance === 30);
            expect(distanceAbove).toBeDefined();
            expect(distanceAbove?.toName).toBe('Divider 2'); // div3 is index 2 in sorted array
            expect(distanceAbove?.toType).toBe('divider');
            
            // Distance below (to div1)
            const distanceBelow = distances.find(d => d.distance === 30);
            expect(distanceBelow).toBeDefined();
        });

        it('should calculate distance to carcass when no adjacent dividers', () => {
            const hoveredDivider = { id: 'div1', position: 30, type: 'horizontal' as const };
            const allHorizontalDividers = [
                { id: 'div1', position: 30, type: 'horizontal' as const }
            ];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8
            };
            const interiorHeight = config.height - (2 * config.materialThickness); // 179.4

            const distances = manager.calculateHorizontalDividerDistances(
                hoveredDivider,
                allHorizontalDividers,
                config
            );

            expect(distances).toHaveLength(2);
            
            // Distance above (to top carcass)
            const distanceAbove = distances.find(d => d.toType === 'carcass' && d.toName === 'Top');
            expect(distanceAbove).toBeDefined();
            expect(distanceAbove?.distance).toBe(interiorHeight - 30); // 149.4
            
            // Distance below (to bottom carcass)
            const distanceBelow = distances.find(d => d.toType === 'carcass' && d.toName === 'Bottom');
            expect(distanceBelow).toBeDefined();
            expect(distanceBelow?.distance).toBe(30);
        });
    });

    describe('Vertical Divider Distance Calculations', () => {
        it('should calculate distances to adjacent vertical dividers correctly', () => {
            const hoveredDivider = { id: 'vdiv2', position: 0, type: 'vertical' as const };
            const allVerticalDividers = [
                { id: 'vdiv1', position: -20, type: 'vertical' as const },
                { id: 'vdiv2', position: 0, type: 'vertical' as const },
                { id: 'vdiv3', position: 20, type: 'vertical' as const }
            ];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8
            };

            const distances = manager.calculateVerticalDividerDistances(
                hoveredDivider,
                allVerticalDividers,
                config
            );

            expect(distances).toHaveLength(2);
            
            // Distance right (to vdiv3)
            const distanceRight = distances.find(d => d.distance === 20);
            expect(distanceRight).toBeDefined();
            expect(distanceRight?.toType).toBe('divider');
            
            // Distance left (to vdiv1)
            const distanceLeft = distances.find(d => d.distance === 20);
            expect(distanceLeft).toBeDefined();
            expect(distanceLeft?.toType).toBe('divider');
        });

        it('should calculate distance to carcass when at edges', () => {
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8
            };
            const interiorWidth = config.width - (2 * config.materialThickness); // 87.4
            
            const hoveredDivider = { id: 'vdiv1', position: -30, type: 'vertical' as const }; // Near left edge
            const allVerticalDividers = [
                { id: 'vdiv1', position: -30, type: 'vertical' as const }
            ];

            const distances = manager.calculateVerticalDividerDistances(
                hoveredDivider,
                allVerticalDividers,
                config
            );

            expect(distances).toHaveLength(2);
            
            // Distance right (to right carcass)
            const distanceRight = distances.find(d => d.toType === 'carcass' && d.toName === 'Right');
            expect(distanceRight).toBeDefined();
            expect(distanceRight?.distance).toBeCloseTo((interiorWidth / 2) - (-30)); // 73.7
            
            // Distance left (to left carcass)
            const distanceLeft = distances.find(d => d.toType === 'carcass' && d.toName === 'Left');
            expect(distanceLeft).toBeDefined();
            expect(distanceLeft?.distance).toBeCloseTo(-30 - (-interiorWidth / 2)); // 13.7
        });
    });

    describe('Label Management', () => {
        it('should show distance labels for hovered divider', () => {
            const hoveredDivider = { id: 'div1', position: 30, type: 'horizontal' as const };
            const horizontalDividers = [hoveredDivider];
            const verticalDividers: any[] = [];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8
            };

            manager.showDistanceLabels(hoveredDivider, horizontalDividers, verticalDividers, config);

            // Check that labels were created in DOM
            const labelContainer = document.getElementById('distance-labels');
            expect(labelContainer).toBeTruthy();
            const labels = labelContainer?.querySelectorAll('.distance-label');
            expect(labels?.length).toBe(2); // Above and below labels
        });

        it('should clear labels when called', () => {
            const hoveredDivider = { id: 'div1', position: 30, type: 'horizontal' as const };
            const horizontalDividers = [hoveredDivider];
            const verticalDividers: any[] = [];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8
            };

            // First show labels
            manager.showDistanceLabels(hoveredDivider, horizontalDividers, verticalDividers, config);
            
            // Then clear them
            manager.clearLabels();

            const labelContainer = document.getElementById('distance-labels');
            const labels = labelContainer?.querySelectorAll('.distance-label');
            expect(labels?.length).toBe(0);
        });
    });

    describe('Label Content', () => {
        it('should format distance labels correctly', () => {
            const hoveredDivider = { id: 'div1', position: 45.7, type: 'horizontal' as const };
            const horizontalDividers = [hoveredDivider];
            const verticalDividers: any[] = [];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8
            };

            manager.showDistanceLabels(hoveredDivider, horizontalDividers, verticalDividers, config);

            const labelContainer = document.getElementById('distance-labels');
            const labels = labelContainer?.querySelectorAll('.distance-label');
            
            expect(labels?.length).toBe(2);
            
            // Check label content format
            const labelTexts = Array.from(labels || []).map(label => label.textContent);
            expect(labelTexts).toContain('45.7cm to Bottom');
            
            const interiorHeight = config.height - (2 * config.materialThickness);
            const distanceToTop = interiorHeight - 45.7;
            expect(labelTexts).toContain(`${distanceToTop.toFixed(1)}cm to Top`);
        });
    });
});