import { describe, it, expect, beforeEach, afterEach, vitest } from 'vitest';
import { App } from '../js/main.js';

// Mock the DividerSystem
vitest.mock('../js/divider-system.js', () => ({
    DividerSystem: vitest.fn(() => ({
        updateShelfConfig: vitest.fn(),
        getAllDividers: vitest.fn(() => ({
            horizontal: [],
            vertical: []
        })),
        setFrontView: vitest.fn(),
        setSideView: vitest.fn(),
        setTopView: vitest.fn(),
        setIsometricView: vitest.fn(),
        reset: vitest.fn(),
        enableDebugMode: vitest.fn(),
        getState: vitest.fn(() => ({ value: 'normal', context: {} }))
    }))
}));

describe('App', () => {
    let app: App;
    let mockDividerSystem: any;

    beforeEach(async () => {
        // Set up DOM elements
        document.body.innerHTML = `
            <input id="width" type="number" value="91" />
            <input id="height" type="number" value="183" />
            <input id="depth" type="number" value="30" />
            <input id="material-thickness" type="number" value="1.8" />
            <select id="material-type">
                <option value="plywood" selected>Plywood</option>
                <option value="oak">Oak</option>
            </select>
            <input id="back-panel" type="checkbox" />
            <input id="wood-grain" type="checkbox" checked />
            <select id="edge-treatment">
                <option value="none" selected>None</option>
            </select>
            <button id="view-front">Front</button>
            <button id="view-side">Side</button>
            <button id="view-top">Top</button>
            <button id="view-iso">Isometric</button>
            <button id="export-pdf">Export PDF</button>
            <button id="reset">Reset</button>
            <button id="debug-toggle">Debug</button>
            <div id="three-canvas"></div>
        `;

        app = new App();
        
        // Access the mocked divider system
        const { DividerSystem } = await import('../js/divider-system.js');
        mockDividerSystem = (DividerSystem as any).mock.results[0].value;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vitest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize with default metric configuration', () => {
            expect(app.currentConfig.width).toBe(91);
            expect(app.currentConfig.height).toBe(183);
            expect(app.currentConfig.depth).toBe(30);
            expect(app.currentConfig.materialThickness).toBe(1.8);
            expect(app.currentConfig.materialType).toBe('plywood');
            expect(app.currentConfig.backPanel).toBe(false);
            expect(app.currentConfig.woodGrain).toBe(true);
        });

        it('should create divider system and call updateShelfConfig', () => {
            expect(mockDividerSystem.updateShelfConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    width: 91,
                    height: 183,
                    depth: 30
                })
            );
        });
    });

    describe('input event handlers', () => {
        it('should update width when width input changes', () => {
            const widthInput = document.getElementById('width') as HTMLInputElement;
            widthInput.value = '120';
            widthInput.dispatchEvent(new Event('input'));

            expect(app.currentConfig.width).toBe(120);
            expect(mockDividerSystem.updateShelfConfig).toHaveBeenCalledWith(
                expect.objectContaining({ width: 120 })
            );
        });

        it('should update height when height input changes', () => {
            const heightInput = document.getElementById('height') as HTMLInputElement;
            heightInput.value = '200';
            heightInput.dispatchEvent(new Event('input'));

            expect(app.currentConfig.height).toBe(200);
            expect(mockDividerSystem.updateShelfConfig).toHaveBeenCalledWith(
                expect.objectContaining({ height: 200 })
            );
        });

        it('should update material type when select changes', () => {
            const materialSelect = document.getElementById('material-type') as HTMLSelectElement;
            materialSelect.value = 'oak';
            materialSelect.dispatchEvent(new Event('change'));

            expect(app.currentConfig.materialType).toBe('oak');
            expect(mockDividerSystem.updateShelfConfig).toHaveBeenCalledWith(
                expect.objectContaining({ materialType: 'oak' })
            );
        });

        it('should update back panel when checkbox changes', () => {
            const backPanelInput = document.getElementById('back-panel') as HTMLInputElement;
            backPanelInput.checked = true;
            backPanelInput.dispatchEvent(new Event('change'));

            expect(app.currentConfig.backPanel).toBe(true);
            expect(mockDividerSystem.updateShelfConfig).toHaveBeenCalledWith(
                expect.objectContaining({ backPanel: true })
            );
        });
    });

    describe('camera view buttons', () => {
        it('should set front view when front button clicked', () => {
            const frontButton = document.getElementById('view-front') as HTMLButtonElement;
            frontButton.click();

            expect(mockDividerSystem.setFrontView).toHaveBeenCalled();
        });

        it('should set side view when side button clicked', () => {
            const sideButton = document.getElementById('view-side') as HTMLButtonElement;
            sideButton.click();

            expect(mockDividerSystem.setSideView).toHaveBeenCalled();
        });

        it('should set top view when top button clicked', () => {
            const topButton = document.getElementById('view-top') as HTMLButtonElement;
            topButton.click();

            expect(mockDividerSystem.setTopView).toHaveBeenCalled();
        });

        it('should set isometric view when iso button clicked', () => {
            const isoButton = document.getElementById('view-iso') as HTMLButtonElement;
            isoButton.click();

            expect(mockDividerSystem.setIsometricView).toHaveBeenCalled();
        });
    });

    describe('reset functionality', () => {
        it('should reset configuration to defaults', () => {
            // Change some values
            app.currentConfig.width = 200;
            app.currentConfig.materialType = 'oak';

            const resetButton = document.getElementById('reset') as HTMLButtonElement;
            resetButton.click();

            expect(app.currentConfig.width).toBe(91);
            expect(app.currentConfig.materialType).toBe('plywood');
            expect(mockDividerSystem.reset).toHaveBeenCalled();
        });

        it('should update UI elements to reflect reset values', () => {
            // Change input values
            const widthInput = document.getElementById('width') as HTMLInputElement;
            widthInput.value = '200';

            const resetButton = document.getElementById('reset') as HTMLButtonElement;
            resetButton.click();

            expect(widthInput.value).toBe('91');
        });
    });

    describe('debug mode', () => {
        it('should enable debug mode when debug button clicked', () => {
            const debugButton = document.getElementById('debug-toggle') as HTMLButtonElement;
            debugButton.click();

            expect(mockDividerSystem.enableDebugMode).toHaveBeenCalled();
        });
    });

    describe('helper methods', () => {
        it('should calculate interior height correctly', () => {
            const interiorHeight = app.getInteriorHeight();
            
            expect(interiorHeight).toBe(183 - (2 * 1.8)); // height - 2 * thickness
        });

        it('should calculate interior width correctly', () => {
            const interiorWidth = app.getInteriorWidth();
            
            expect(interiorWidth).toBe(91 - (2 * 1.8)); // width - 2 * thickness
        });

        it('should return current dividers from divider system', () => {
            const mockDividers = {
                horizontal: [{ id: '1', position: 50 }],
                vertical: [{ id: '2', position: 25 }]
            };
            
            mockDividerSystem.getAllDividers.mockReturnValue(mockDividers);
            
            const result = app.getCurrentDividers();
            
            expect(result).toEqual(mockDividers);
        });

        it('should return system state for debugging', () => {
            const mockState = { value: 'normal', context: {} };
            mockDividerSystem.getState.mockReturnValue(mockState);
            
            const systemState = app.getSystemState();
            
            expect(systemState).toEqual({
                config: app.currentConfig,
                dividerSystemState: mockState,
                dividers: { horizontal: [], vertical: [] }
            });
        });
    });
});