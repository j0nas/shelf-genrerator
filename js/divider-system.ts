import { createDividerSystemService } from "./divider-state-machine.js";
import { ShelfRenderer } from "./shelf-renderer.js";
import { InputController } from "./input-controller.js";

// Main controller that orchestrates the clean architecture
export class DividerSystem {
  private stateMachine: any;
  private renderer: ShelfRenderer;
  private inputController: InputController;

  constructor(containerId: string) {
    // Initialize pure components
    this.stateMachine = createDividerSystemService();
    this.renderer = new ShelfRenderer(containerId);
    this.inputController = new InputController(this.renderer, this.stateMachine);

    this.setupStateMachine();
    this.setupInputCallbacks();
    this.start();
  }

  setupStateMachine() {
    // Subscribe to state changes and re-render
    this.stateMachine.onTransition((state: any) => {
      console.log(`🎯 State: ${state.value}`);

      // Pure view update - renderer is a function of state
      this.renderer.render(state);

      // Sync external state (for legacy compatibility)
      this.syncToExternalState(state);
    });


    // Add keyboard shortcuts
    this.inputController.setupKeyboardShortcuts();
  }

  setupInputCallbacks() {
    // Set up render callback for live drag updates
    this.inputController.setRenderCallback(() => {
      const currentState = this.stateMachine.getSnapshot();
      this.renderer.render(currentState);
    });
  }

  start() {
    this.stateMachine.start();
    console.log("✅ Clean XState Divider System initialized");
  }

  // Public API for external components
  updateShelfConfig(config: any) {
    this.renderer.setShelfConfig(config);
    this.stateMachine.send({
      type: "UPDATE_SHELF_CONFIG",
      config: config,
    });
  }

  // Get current state (for debugging)
  getState() {
    return this.stateMachine.getSnapshot();
  }

  // Get all dividers for external systems (cut list, etc.)
  getAllDividers() {
    const state = this.stateMachine.getSnapshot();
    return {
      horizontal: state.context.horizontalDividers,
      vertical: state.context.verticalDividers,
    };
  }

  // For legacy compatibility - sync state to external systems
  private syncToExternalState(state: any) {
    // Update the main App's currentConfig to keep UI in sync
    const app = (window as any).app;
    if (!app) return;

    // Only update if the dividers have actually changed
    const currentHorizontal = app.currentConfig.shelfLayout || [];
    const currentVertical = app.currentConfig.verticalDividers || [];

    const newHorizontal = state.context.horizontalDividers.map((d: any) => ({
      id: d.id,
      position: d.position,
    }));

    const newVertical = state.context.verticalDividers.map((d: any) => ({
      id: d.id,
      position: d.position,
    }));

    // Check if dividers changed
    const horizontalChanged = !this.arraysEqual(currentHorizontal, newHorizontal);
    const verticalChanged = !this.arraysEqual(currentVertical, newVertical);

    if (horizontalChanged || verticalChanged) {
      app.currentConfig.shelfLayout = newHorizontal;
      app.currentConfig.verticalDividers = newVertical;

      // No UI controls to update - managed by DividerSystem
    }
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (a[i].id !== b[i].id || a[i].position !== b[i].position) {
        return false;
      }
    }

    return true;
  }

  // Initialize from external state (for backward compatibility)
  initializeFromExternalState(config: any) {
    this.updateShelfConfig(config);

    // Load existing dividers
    if (config.shelfLayout) {
      for (const divider of config.shelfLayout) {
        this.stateMachine.send({
          type: "ADD_EXISTING_DIVIDER",
          divider: {
            id: divider.id,
            position: divider.position,
            type: "horizontal",
          },
        });
      }
    }

    if (config.verticalDividers) {
      for (const divider of config.verticalDividers) {
        this.stateMachine.send({
          type: "ADD_EXISTING_DIVIDER",
          divider: {
            id: divider.id,
            position: divider.position,
            type: "vertical",
          },
        });
      }
    }
  }

  // Debugging methods
  enableDebugMode() {
    console.log("🐛 Debug mode enabled");

    // Log all state transitions
    this.stateMachine.onTransition((state: any, event: any) => {
      console.log("🎯 State Transition:", {
        from: state.history?.value || "initial",
        to: state.value,
        event: event.type,
        context: state.context,
      });
    });
  }

  // Reset system
  reset() {
    this.stateMachine.send({ type: "RESET" });
  }

  // Camera view methods
  setFrontView() {
    this.renderer.setFrontView();
  }

  setSideView() {
    this.renderer.setSideView();
  }

  setTopView() {
    this.renderer.setTopView();
  }

  setIsometricView() {
    this.renderer.setIsometricView();
  }
}
