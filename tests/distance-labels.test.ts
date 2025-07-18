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
                materialThickness: 1.8,
                units: 'metric' as const
            };

            const distances = manager.calculateHorizontalDividerDistances(
                hoveredDivider,
                allHorizontalDividers,
                config
            ) as any[];

            expect(distances).toHaveLength(2);
            
            // Distance above (to div3) - should be 30 - 1.8 = 28.2
            const distanceAbove = distances.find(d => d.distance === 28.2);
            expect(distanceAbove).toBeDefined();
            expect(distanceAbove?.toName).toBe('Divider 2'); // div3 is index 2 in sorted array
            expect(distanceAbove?.toType).toBe('divider');
            
            // Distance below (to div1) - should be 30 - 1.8 = 28.2
            const distanceBelow = distances.find(d => d.distance === 28.2);
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
                materialThickness: 1.8,
                units: 'metric' as const
            };
            const interiorHeight = config.height - (2 * config.materialThickness); // 179.4

            const distances = manager.calculateHorizontalDividerDistances(
                hoveredDivider,
                allHorizontalDividers,
                config
            );

            expect(distances).toHaveLength(2);
            
            // Distance above (to top carcass) - accounts for material thickness
            const distanceAbove = distances.find(d => d.toType === 'carcass' && d.toName === 'Top');
            expect(distanceAbove).toBeDefined();
            expect(distanceAbove?.distance).toBe((interiorHeight - config.materialThickness/2) - 30); // 148.5
            
            // Distance below (to bottom carcass) - accounts for material thickness
            const distanceBelow = distances.find(d => d.toType === 'carcass' && d.toName === 'Bottom');
            expect(distanceBelow).toBeDefined();
            expect(distanceBelow?.distance).toBe(30 - config.materialThickness/2); // 29.1
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
                materialThickness: 1.8,
                units: 'metric' as const
            };

            const distances = manager.calculateVerticalDividerDistances(
                hoveredDivider,
                allVerticalDividers,
                config
            );

            expect(distances).toHaveLength(2);
            
            // Distance right (to vdiv3) - should be 20 - 1.8 = 18.2
            const distanceRight = distances.find(d => d.distance === 18.2);
            expect(distanceRight).toBeDefined();
            expect(distanceRight?.toType).toBe('divider');
            
            // Distance left (to vdiv1) - should be 20 - 1.8 = 18.2
            const distanceLeft = distances.find(d => d.distance === 18.2);
            expect(distanceLeft).toBeDefined();
            expect(distanceLeft?.toType).toBe('divider');
        });

        it('should calculate distance to carcass when at edges', () => {
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8,
                units: 'metric' as const
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
            
            // Distance right (to right carcass) - accounts for material thickness
            const distanceRight = distances.find(d => d.toType === 'carcass' && d.toName === 'Right');
            expect(distanceRight).toBeDefined();
            expect(distanceRight?.distance).toBeCloseTo((interiorWidth / 2 - config.materialThickness/2) - (-30)); // 72.8
            
            // Distance left (to left carcass) - accounts for material thickness
            const distanceLeft = distances.find(d => d.toType === 'carcass' && d.toName === 'Left');
            expect(distanceLeft).toBeDefined();
            expect(distanceLeft?.distance).toBeCloseTo(-30 - (-interiorWidth / 2 + config.materialThickness/2)); // 12.8
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
                materialThickness: 1.8,
                units: 'metric' as const
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
                materialThickness: 1.8,
                units: 'metric' as const
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
                materialThickness: 1.8,
                units: 'metric' as const
            };

            manager.showDistanceLabels(hoveredDivider, horizontalDividers, verticalDividers, config);

            const labelContainer = document.getElementById('distance-labels');
            const labels = labelContainer?.querySelectorAll('.distance-label');
            
            expect(labels?.length).toBe(2);
            
            // Check label content format
            const labelTexts = Array.from(labels || []).map(label => label.textContent);
            expect(labelTexts).toContain('44.8cm to Bottom'); // 45.7 - 0.9 (thickness/2)
            
            const interiorHeight = config.height - (2 * config.materialThickness);
            const distanceToTop = (interiorHeight - config.materialThickness/2) - 45.7;
            expect(labelTexts).toContain(`${distanceToTop.toFixed(1)}cm to Top`);
        });
    });

    describe('Distance Calculation Logic', () => {
        it('should calculate correct distances when dividers are far apart', () => {
            const hoveredDivider = { id: 'vdiv1', position: 0, type: 'vertical' as const };
            const allVerticalDividers = [
                { id: 'vdiv1', position: 0, type: 'vertical' as const },
                { id: 'vdiv2', position: 30, type: 'vertical' as const } // Far apart
            ];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8,
                units: 'metric' as const
            };

            const distances = manager.calculateVerticalDividerDistances(
                hoveredDivider,
                allVerticalDividers,
                config
            );

            // Should return separate distance calculations
            expect(distances.length).toBeGreaterThanOrEqual(1);
            
            // Check that distances are calculated correctly
            const rightDistance = distances.find(d => d.toName.includes('Divider'));
            expect(rightDistance).toBeDefined();
            expect(rightDistance?.distance).toBeCloseTo(28.2, 1); // 30 - 1.8 material thickness
        });

        it('should handle edge cases with dividers at boundaries', () => {
            const hoveredDivider = { id: 'div1', position: 5, type: 'horizontal' as const }; // Near bottom
            const allHorizontalDividers = [
                { id: 'div1', position: 5, type: 'horizontal' as const }
            ];
            const config = {
                width: 91,
                height: 183,
                depth: 30,
                materialThickness: 1.8,
                units: 'metric' as const
            };

            const distances = manager.calculateHorizontalDividerDistances(
                hoveredDivider,
                allHorizontalDividers,
                config
            );

            expect(distances).toHaveLength(2); // One to bottom carcass, one to top carcass
            
            const bottomDistance = distances.find(d => d.toName === 'Bottom');
            const topDistance = distances.find(d => d.toName === 'Top');
            
            expect(bottomDistance).toBeDefined();
            expect(topDistance).toBeDefined();
            expect(bottomDistance?.distance).toBeCloseTo(4.1, 1); // 5 - 0.9 (thickness/2)
        });
    });
});