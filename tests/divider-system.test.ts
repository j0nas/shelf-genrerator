import { describe, it, expect, beforeEach, afterEach, vitest } from 'vitest';
import { DividerSystem } from '../js/divider-system.js';

// Mock the dependencies
vitest.mock('../js/divider-state-machine.js', () => ({
    createDividerSystemService: vitest.fn(() => ({
        onTransition: vitest.fn(),
        start: vitest.fn(),
        send: vitest.fn(),
        getSnapshot: vitest.fn(() => ({
            context: {
                horizontalDividers: [],
                verticalDividers: []
            }
        }))
    }))
}));

vitest.mock('../js/shelf-renderer.js', () => ({
    ShelfRenderer: vitest.fn(() => ({
        render: vitest.fn(),
        setShelfConfig: vitest.fn(),
        setFrontView: vitest.fn(),
        setSideView: vitest.fn(),
        setTopView: vitest.fn(),
        setIsometricView: vitest.fn()
    }))
}));

vitest.mock('../js/input-controller.js', () => ({
    InputController: vitest.fn(() => ({
        setupKeyboardShortcuts: vitest.fn(),
        setRenderCallback: vitest.fn()
    }))
}));

// Mock window for global access
Object.defineProperty(window, 'app', {
    value: {
        currentConfig: {
            shelfLayout: [],
            verticalDividers: []
        }
    },
    writable: true
});

describe('DividerSystem', () => {
    let dividerSystem: DividerSystem;
    let mockService: any;
    let mockRenderer: any;
    let mockInputController: any;

    beforeEach(async () => {
        // Create container element
        const container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);

        dividerSystem = new DividerSystem('test-container');
        
        // Access the mocked instances
        const { createDividerSystemService } = await import('../js/divider-state-machine.js');
        const { ShelfRenderer } = await import('../js/shelf-renderer.js');
        const { InputController } = await import('../js/input-controller.js');
        
        mockService = (createDividerSystemService as any).mock.results[0].value;
        mockRenderer = (ShelfRenderer as any).mock.results[0].value;
        mockInputController = (InputController as any).mock.results[0].value;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vitest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should create state machine, renderer, and input controller', () => {
            expect(mockService.start).toHaveBeenCalled();
            expect(mockService.onTransition).toHaveBeenCalled();
            expect(mockInputController.setupKeyboardShortcuts).toHaveBeenCalled();
        });

        it('should set up state machine transition handler', () => {
            expect(mockService.onTransition).toHaveBeenCalledWith(expect.any(Function));
        });
    });

    describe('updateShelfConfig', () => {
        it('should update renderer and send event to state machine', () => {
            const config = { width: 100, height: 200, depth: 50 };
            
            dividerSystem.updateShelfConfig(config);
            
            expect(mockRenderer.setShelfConfig).toHaveBeenCalledWith(config);
            expect(mockService.send).toHaveBeenCalledWith({
                type: 'UPDATE_SHELF_CONFIG',
                config: config
            });
        });
    });

    describe('getState', () => {
        it('should return state machine snapshot', () => {
            const mockSnapshot = { value: 'normal', context: {} };
            mockService.getSnapshot.mockReturnValue(mockSnapshot);
            
            const result = dividerSystem.getState();
            
            expect(result).toBe(mockSnapshot);
            expect(mockService.getSnapshot).toHaveBeenCalled();
        });
    });

    describe('getAllDividers', () => {
        it('should return dividers from state context', () => {
            const mockDividers = {
                horizontal: [{ id: '1', position: 50 }],
                vertical: [{ id: '2', position: 25 }]
            };
            
            mockService.getSnapshot.mockReturnValue({
                context: {
                    horizontalDividers: mockDividers.horizontal,
                    verticalDividers: mockDividers.vertical
                }
            });
            
            const result = dividerSystem.getAllDividers();
            
            expect(result).toEqual(mockDividers);
        });
    });

    describe('camera view methods', () => {
        it('should delegate to renderer setFrontView', () => {
            dividerSystem.setFrontView();
            expect(mockRenderer.setFrontView).toHaveBeenCalled();
        });

        it('should delegate to renderer setSideView', () => {
            dividerSystem.setSideView();
            expect(mockRenderer.setSideView).toHaveBeenCalled();
        });

        it('should delegate to renderer setTopView', () => {
            dividerSystem.setTopView();
            expect(mockRenderer.setTopView).toHaveBeenCalled();
        });

        it('should delegate to renderer setIsometricView', () => {
            dividerSystem.setIsometricView();
            expect(mockRenderer.setIsometricView).toHaveBeenCalled();
        });
    });

    describe('reset', () => {
        it('should send RESET event to state machine', () => {
            dividerSystem.reset();
            
            expect(mockService.send).toHaveBeenCalledWith({ type: 'RESET' });
        });
    });

    describe('state synchronization', () => {
        it('should sync state to external app when dividers change', () => {
            const transitionCallback = mockService.onTransition.mock.calls[0][0];
            
            const mockState = {
                value: 'normal',
                context: {
                    horizontalDividers: [{ id: '1', position: 50 }],
                    verticalDividers: [{ id: '2', position: 25 }]
                }
            };
            
            transitionCallback(mockState);
            
            expect(mockRenderer.render).toHaveBeenCalledWith(mockState);
        });
    });
});